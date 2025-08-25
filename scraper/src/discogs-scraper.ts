import axios from 'axios'
import * as cheerio from 'cheerio'
import { VideoData } from './types'
import { CSVWriter } from './csv-writer'
import { deduplicateVideos, extractVideoId, cleanTitle } from './utils'
import * as path from 'path'
import * as fs from 'fs'

export class DiscogsScraper {
  private readonly baseUrl = 'https://www.discogs.com'
  private processedArtists = new Set<string>()
  private collectedVideos: VideoData[] = []
  
  async scrapeArtistPage(artistUrl: string): Promise<VideoData[]> {
    console.log(`🎵 Starting Discogs scrape for: ${artistUrl}`)
    console.log('=' .repeat(60))
    
    try {
      // Extract artist ID from URL
      const artistId = this.extractArtistId(artistUrl)
      if (!artistId) {
        console.error('❌ Invalid Discogs artist URL')
        return []
      }
      
      // Scrape main artist
      await this.scrapeArtist(artistId, artistUrl)
      
      console.log(`\\n✅ Scraping completed!`)
      console.log(`📊 Total unique videos found: ${this.collectedVideos.length}`)
      
      return this.collectedVideos
      
    } catch (error) {
      console.error('❌ Discogs scraping failed:', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }
  
  private async scrapeArtist(artistId: string, artistUrl: string): Promise<void> {
    if (this.processedArtists.has(artistId)) {
      console.log(`⚪ Already processed artist ${artistId}, skipping`)
      return
    }
    
    this.processedArtists.add(artistId)
    console.log(`\\n🎤 Processing artist: ${artistId}`)
    
    try {
      // Get artist page
      const artistPage = await this.fetchPage(artistUrl)
      if (!artistPage) return
      
      const $ = cheerio.load(artistPage)
      const artistName = $('h1.header_1').text().trim() || 'Unknown Artist'
      console.log(`   📛 Artist: ${artistName}`)
      
      // Step 1: Scrape all releases
      await this.scrapeArtistReleases(artistId, artistName)
      
      // Step 2: Find and scrape aliases
      await this.scrapeArtistAliases($, artistName)
      
      // Step 3: Find and scrape groups
      await this.scrapeArtistGroups($, artistName)
      
    } catch (error) {
      console.error(`❌ Error processing artist ${artistId}:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  
  private async scrapeArtistReleases(artistId: string, artistName: string): Promise<void> {
    console.log(`   📀 Scraping releases for ${artistName}...`)
    
    let page = 1
    let hasMorePages = true
    
    while (hasMorePages) {
      try {
        const releasesUrl = `${this.baseUrl}/artist/${artistId}?type=Releases&page=${page}`
        console.log(`      📄 Page ${page}...`)
        
        const releasesPage = await this.fetchPage(releasesUrl)
        if (!releasesPage) break
        
        const $ = cheerio.load(releasesPage)
        const releases: string[] = []
        
        // Find release links
        $('a[href*="/release/"]').each((_, element) => {
          const href = $(element).attr('href')
          if (href && href.includes('/release/')) {
            const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : href
            releases.push(fullUrl)
          }
        })
        
        if (releases.length === 0) {
          hasMorePages = false
          break
        }
        
        console.log(`      ✅ Found ${releases.length} releases on page ${page}`)
        
        // Process each release
        for (const releaseUrl of releases) {
          await this.scrapeRelease(releaseUrl, artistName)
          await this.delay(500) // Be respectful to Discogs
        }
        
        // Check for next page
        const nextPageLink = $('a.pagination_next')
        hasMorePages = nextPageLink.length > 0 && !nextPageLink.hasClass('pagination_page_link_inactive')
        
        if (hasMorePages) {
          page++
          await this.delay(1000) // Longer delay between pages
        }
        
      } catch (error) {
        console.error(`❌ Error on releases page ${page}:`, error instanceof Error ? error.message : 'Unknown error')
        hasMorePages = false
      }
    }
    
    console.log(`   ✅ Processed ${page} pages of releases for ${artistName}`)
  }
  
  private async scrapeRelease(releaseUrl: string, artistName: string): Promise<void> {
    try {
      const releasePage = await this.fetchPage(releaseUrl)
      if (!releasePage) return
      
      const $ = cheerio.load(releasePage)
      const releaseTitle = $('h1[data-testid="title"]').text().trim() || 'Unknown Release'
      
      // Look for Videos section
      const videosSection = $('section[data-testid="videos"], .section_content:contains("Videos")')
      if (videosSection.length === 0) {
        return // No videos section
      }
      
      // Find YouTube links in the videos section
      const youtubeLinks: string[] = []
      videosSection.find('a[href*="youtube.com"], a[href*="youtu.be"]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          youtubeLinks.push(href)
        }
      })
      
      // Also check for any YouTube embeds or iframes
      videosSection.find('iframe[src*="youtube.com"]').each((_, element) => {
        const src = $(element).attr('src')
        if (src) {
          // Convert embed URL to watch URL
          const videoId = this.extractVideoIdFromEmbed(src)
          if (videoId) {
            youtubeLinks.push(`https://www.youtube.com/watch?v=${videoId}`)
          }
        }
      })
      
      if (youtubeLinks.length > 0) {
        console.log(`      🔗 Found ${youtubeLinks.length} YouTube links in "${releaseTitle}"`)
        
        for (const link of youtubeLinks) {
          const videoData = await this.extractVideoData(link, artistName, releaseTitle)
          if (videoData) {
            this.collectedVideos.push(videoData)
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error scraping release ${releaseUrl}:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  
  private async scrapeArtistAliases($: cheerio.CheerioAPI, artistName: string): Promise<void> {
    console.log(`   🎭 Looking for aliases of ${artistName}...`)
    
    // Look for aliases section
    const aliasesSection = $('.section_content:contains("Aliases"), .profile:contains("Aliases")')
    const aliasLinks: string[] = []
    
    aliasesSection.find('a[href*="/artist/"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href && href.includes('/artist/')) {
        const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : href
        aliasLinks.push(fullUrl)
      }
    })
    
    if (aliasLinks.length > 0) {
      console.log(`   ✅ Found ${aliasLinks.length} aliases for ${artistName}`)
      
      for (const aliasUrl of aliasLinks) {
        const aliasId = this.extractArtistId(aliasUrl)
        if (aliasId) {
          await this.scrapeArtist(aliasId, aliasUrl)
          await this.delay(2000) // Longer delay for aliases
        }
      }
    } else {
      console.log(`   ⚪ No aliases found for ${artistName}`)
    }
  }
  
  private async scrapeArtistGroups($: cheerio.CheerioAPI, artistName: string): Promise<void> {
    console.log(`   🎸 Looking for groups involving ${artistName}...`)
    
    // Look for groups/member of section
    const groupsSection = $('.section_content:contains("Member Of"), .section_content:contains("Groups"), .profile:contains("Member Of")')
    const groupLinks: string[] = []
    
    groupsSection.find('a[href*="/artist/"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href && href.includes('/artist/')) {
        const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : href
        groupLinks.push(fullUrl)
      }
    })
    
    if (groupLinks.length > 0) {
      console.log(`   ✅ Found ${groupLinks.length} groups for ${artistName}`)
      
      for (const groupUrl of groupLinks) {
        const groupId = this.extractArtistId(groupUrl)
        if (groupId) {
          await this.scrapeArtist(groupId, groupUrl)
          await this.delay(2000) // Longer delay for groups
        }
      }
    } else {
      console.log(`   ⚪ No groups found for ${artistName}`)
    }
  }
  
  private async extractVideoData(youtubeUrl: string, artistName: string, releaseTitle: string): Promise<VideoData | null> {
    try {
      const videoId = extractVideoId(youtubeUrl)
      if (!videoId) return null
      
      // Try to get video title from YouTube
      const videoTitle = await this.getYouTubeTitle(youtubeUrl) || `${artistName} - ${releaseTitle}`
      
      return {
        url: youtubeUrl,
        title: cleanTitle(videoTitle),
        videoId: videoId,
        channel: `Discogs: ${artistName}`
      }
      
    } catch (error) {
      console.error(`❌ Error extracting video data from ${youtubeUrl}:`, error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }
  
  private async getYouTubeTitle(youtubeUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(youtubeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      })
      
      const $ = cheerio.load(response.data)
      const title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="title"]').attr('content') ||
                   $('title').text()
      
      return title ? title.replace(/\s*-\s*YouTube\s*$/, '').trim() : null
      
    } catch (error) {
      return null // Silently fail for YouTube title extraction
    }
  }
  
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      })
      
      return response.data
      
    } catch (error) {
      console.error(`❌ Error fetching page ${url}:`, error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }
  
  private extractArtistId(url: string): string | null {
    const match = url.match(/\/artist\/(\d+)/)
    return match ? match[1] : null
  }
  
  private extractVideoIdFromEmbed(embedUrl: string): string | null {
    const match = embedUrl.match(/\/embed\/([^\?&]+)/)
    return match ? match[1] : null
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Main function to run Discogs scraper
const discogsScrapingMain = async (artistUrl: string): Promise<void> => {
  console.log('🎵 Discogs Artist Scraper for Larry Heard Collection')
  console.log('=' .repeat(70))
  console.log(`🔗 Artist URL: ${artistUrl}`)
  
  const scraper = new DiscogsScraper()
  const collectionPath = path.join(__dirname, '../data/larry-heard-collection.csv')
  const csvWriter = new CSVWriter(collectionPath)
  
  const allVideos: VideoData[] = []
  
  try {
    // Step 1: Load existing collection
    console.log('📚 Loading existing collection...')
    if (fs.existsSync(collectionPath)) {
      const existingVideos = await loadCsvData(collectionPath)
      allVideos.push(...existingVideos)
      console.log(`✅ Loaded ${existingVideos.length} existing videos`)
    }
    
    // Step 2: Scrape Discogs artist
    const discogsVideos = await scraper.scrapeArtistPage(artistUrl)
    
    if (discogsVideos.length === 0) {
      console.log('❌ No YouTube videos found on Discogs pages.')
      return
    }
    
    console.log(`✅ Found ${discogsVideos.length} YouTube videos from Discogs`)
    allVideos.push(...discogsVideos)
    
    // Step 3: Deduplication
    console.log('\\n🔄 Removing duplicates...')
    const initialCount = allVideos.length
    const uniqueVideos = deduplicateVideos(allVideos)
    const newVideos = uniqueVideos.length - (initialCount - discogsVideos.length)
    const duplicatesRemoved = discogsVideos.length - newVideos
    
    console.log(`📊 Discogs videos: ${discogsVideos.length}`)
    console.log(`📊 New videos added: ${newVideos}`)
    console.log(`🔄 Duplicates skipped: ${duplicatesRemoved}`)
    console.log(`📊 Total collection size: ${uniqueVideos.length}`)
    
    // Step 4: Save updated collection
    await csvWriter.writeVideos(uniqueVideos)
    
    console.log('\\n' + '✅'.repeat(30))
    console.log('✅ DISCOGS SCRAPING COMPLETED!')
    console.log('✅'.repeat(30))
    console.log(`📁 Updated: ${collectionPath}`)
    console.log(`🎵 Collection now contains ${uniqueVideos.length} unique videos`)
    
    if (newVideos > 0) {
      console.log('\\n🎵 Sample of newly added videos from Discogs:')
      const newlyAdded = uniqueVideos.slice(-Math.min(newVideos, 8))
      newlyAdded.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`)
        console.log(`   🔗 ${video.url}`)
        console.log(`   📺 ${video.channel}`)
        console.log()
      })
    }
    
    console.log(`\\n🚀 Run 'yarn update-vue' to update the Vue app with new videos!`)
    
  } catch (error) {
    console.error('❌ Failed to scrape Discogs:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Helper function to load existing CSV data
const loadCsvData = async (filePath: string): Promise<VideoData[]> => {
  return new Promise((resolve, reject) => {
    const videos: VideoData[] = []
    const csv = require('csv-parser')
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: any) => {
        if (row.URL && row.Title && row['Video ID']) {
          videos.push({
            url: row.URL,
            title: row.Title,
            videoId: row['Video ID'],
            channel: row.Channel || 'Unknown'
          })
        }
      })
      .on('end', () => resolve(videos))
      .on('error', reject)
  })
}

// Run the script
if (require.main === module) {
  const artistUrl = process.argv[2]
  
  if (!artistUrl) {
    console.error('❌ Please provide a Discogs artist URL as an argument')
    console.log('\\n🔗 Usage:')
    console.log('   ts-node src/discogs-scraper.ts "https://www.discogs.com/artist/1234-Artist-Name"')
    console.log('   yarn add-discogs "https://www.discogs.com/artist/1234-Artist-Name"')
    process.exit(1)
  }
  
  if (!artistUrl.includes('discogs.com/artist/')) {
    console.error('❌ Invalid Discogs artist URL. Please provide a valid Discogs artist URL.')
    console.log('\\n🔗 Example:')
    console.log('   https://www.discogs.com/artist/1234-Larry-Heard')
    process.exit(1)
  }
  
  discogsScrapingMain(artistUrl).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { discogsScrapingMain }
