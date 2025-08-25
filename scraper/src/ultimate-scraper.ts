import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'
import * as fs from 'fs'

const ultimateScrapingMain = async (): Promise<void> => {
  console.log('🎵 ULTIMATE Larry Heard Collection Scraper')
  console.log('🚀 Everything: All aliases, groups, playlists, and searches')
  console.log('=' .repeat(80))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(path.join(__dirname, '../data/larry-heard-collection.csv'))
  
  const allVideos: VideoData[] = []
  
  // Load existing data from all previous scrapes
  const existingFiles = [
    path.join(__dirname, '../data/larry-heard-videos.csv'),
    path.join(__dirname, '../data/larry-heard-enhanced.csv'),
    path.join(__dirname, '../data/larry-heard-albums-playlists.csv'),
    path.join(__dirname, '../data/larry-heard-master.csv'),
    path.join(__dirname, '../data/larry-heard-comprehensive.csv'),
    path.join(__dirname, '../data/larry-heard-ultimate.csv')
  ]
  
  // Known high-quality playlists (manually curated)
  const knownPlaylists = [
    'https://www.youtube.com/playlist?list=PLsfO53doee0fzd6hDScc13_DNiCXbKHl8',
    // Add more manually discovered high-quality playlists here
  ]
  
  // Specific playlist search terms (more likely to find playlists)
  const playlistSearchTerms = [
    'Larry Heard playlist',
    'Mr Fingers playlist',
    'Larry Heard collection playlist',
    'Larry Heard mix playlist',
    'deep house Larry Heard playlist',
    'Chicago house Larry Heard playlist',
    'Fingers Inc playlist',
    'Larry Heard essential playlist',
    'Mr Fingers deep house playlist'
  ]
  
  // Complete list of ALL search terms
  const ultimateSearchTerms = [
    // Main identity
    'Larry Heard',
    'Mr. Fingers',
    'Mr Fingers',
    
    // Aliases
    '2nd Avenew',
    'Ace "Smokin" Amy',
    'Ace Smokin Amy',
    'Blakk Society',
    'Disco-D Larry Heard',
    'Gherkin Jerks',
    'Loosefingers',
    'The Housefactors',
    'Trio Zero',
    
    // Groups
    'Fingers Inc',
    'Fingers Inc.',
    'Nightshift Chicago house',
    'The It Larry Heard',
    'The Ram Project',
    'Fingers N Flowers',
    
    // Enhanced searches
    'Larry Heard albums',
    'Larry Heard discography',
    'Larry Heard complete',
    'Larry Heard collection',
    'Larry Heard essential',
    'Larry Heard best of',
    'Larry Heard greatest hits',
    'Larry Heard compilation',
    'Mr Fingers albums',
    'Mr Fingers discography',
    'Mr Fingers essential',
    'Fingers Inc albums',
    
    // Style searches
    'Larry Heard house music',
    'Larry Heard deep house',
    'Larry Heard Chicago house',
    'Larry Heard classic house',
    'Larry Heard acid house',
    'Larry Heard minimal',
    'Larry Heard classic',
    'Larry Heard rare',
    'Larry Heard vinyl',
    'Larry Heard unreleased',
    
    // Performance searches
    'Larry Heard live',
    'Larry Heard DJ set',
    'Larry Heard mix',
    'Larry Heard radio',
    'Mr Fingers live',
    'Mr Fingers DJ set',
    
    // Collaboration searches
    'Larry Heard remix',
    'Larry Heard collaboration',
    'Larry Heard production',
    'Larry Heard featuring'
  ]
  
  try {
    // Step 1: Load all existing data
    console.log('📚 Step 1: Loading ALL existing data...')
    for (const filePath of existingFiles) {
      if (fs.existsSync(filePath)) {
        console.log(`   📄 Loading: ${path.basename(filePath)}`)
        const existingVideos = await loadCsvData(filePath)
        allVideos.push(...existingVideos)
        console.log(`   ✅ Loaded ${existingVideos.length} videos`)
      }
    }
    console.log(`📊 Total existing videos loaded: ${allVideos.length}`)
    
    // Step 2: Add known high-quality playlists
    console.log('\\n➕ Step 2: Adding known playlists...')
    knownPlaylists.forEach(playlist => {
      scraper.addSpecificPlaylist(playlist)
      console.log(`   ➕ Added: ${playlist}`)
    })
    
    // Step 3: Dedicated playlist discovery phase
    console.log('\\n🔍 Step 3: DEDICATED playlist discovery...')
    console.log(`📋 Searching ${playlistSearchTerms.length} playlist-specific terms...`)
    
    for (const playlistTerm of playlistSearchTerms) {
      console.log(`   📋 "${playlistTerm}"`)
      const videos = await scraper.searchPlaylistsAndVideos(playlistTerm, 20)
      allVideos.push(...videos)
      if (videos.length > 0) {
        console.log(`   ✅ Found ${videos.length} videos`)
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
    
    console.log(`📋 Playlists discovered so far: ${scraper.getDiscoveredPlaylists().length}`)
    
    // Step 4: Main search phase
    console.log('\\n🔍 Step 4: Main search & additional discovery...')
    console.log(`🎯 Performing ${ultimateSearchTerms.length} comprehensive searches...`)
    
    let searchCount = 0
    for (const searchTerm of ultimateSearchTerms) {
      searchCount++
      console.log(`[${searchCount}/${ultimateSearchTerms.length}] 🔍 "${searchTerm}"`)
      
      // Search for both videos and playlists
      const videos = await scraper.searchPlaylistsAndVideos(searchTerm, 35)
      allVideos.push(...videos)
      
      if (videos.length > 0) {
        console.log(`   ✅ Found ${videos.length} videos`)
      }
      
      // Progress update every 15 searches
      if (searchCount % 15 === 0) {
        const currentPlaylists = scraper.getDiscoveredPlaylists().length
        console.log(`   📊 Progress: ${searchCount}/${ultimateSearchTerms.length} | Total playlists: ${currentPlaylists}`)
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    console.log(`\\n📋 TOTAL PLAYLISTS DISCOVERED: ${discoveredPlaylists.length}`)
    
    // Show all discovered playlists
    if (discoveredPlaylists.length > 0) {
      console.log('\\n📋 All discovered playlists:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
    }
    
    // Step 5: Scrape ALL discovered playlists
    console.log('\\n🎵 Step 5: Scraping ALL discovered playlists...')
    if (discoveredPlaylists.length > 0) {
      const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(80) // More videos per playlist
      allVideos.push(...playlistVideos)
      console.log(`✅ Added ${playlistVideos.length} videos from ${discoveredPlaylists.length} playlists`)
    } else {
      console.log('⚠️  No playlists to scrape')
    }
    
    // Step 6: FINAL processing and stats
    console.log('\\n🔄 Step 6: Final deduplication and analysis...')
    console.log(`📊 TOTAL videos before deduplication: ${allVideos.length}`)
    
    const uniqueVideos = deduplicateVideos(allVideos)
    const duplicatesRemoved = allVideos.length - uniqueVideos.length
    
    console.log(`🔄 Removed ${duplicatesRemoved} duplicates`)
    console.log(`🎵 ULTIMATE COLLECTION SIZE: ${uniqueVideos.length} unique videos`)
    
    // Step 7: Save ultimate collection
    await csvWriter.writeVideos(uniqueVideos)
    
    // ULTIMATE FINAL REPORT
    console.log('\\n' + '🎉'.repeat(40))
    console.log('🎉 ULTIMATE LARRY HEARD COLLECTION COMPLETE! 🎉')
    console.log('🎉'.repeat(40))
    console.log(`\\n📁 Saved to: ${path.join(__dirname, '../data/larry-heard-collection.csv')}`)
    console.log(`🎵 ULTIMATE COLLECTION: ${uniqueVideos.length} unique videos`)
    console.log(`📋 Playlists discovered & scraped: ${discoveredPlaylists.length}`)
    console.log(`🔍 Search terms used: ${ultimateSearchTerms.length}`)
    console.log(`🔄 Total searches performed: ${searchCount}`)
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`)
    console.log(`📚 Existing files processed: ${existingFiles.filter(f => fs.existsSync(f)).length}`)
    
    // Ultimate sample showcase
    console.log('\\n🎵 ULTIMATE COLLECTION SAMPLE:')
    uniqueVideos.slice(0, 20).forEach((video, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${video.title}`)
      console.log(`    🔗 ${video.url}`)
      console.log(`    📺 ${video.channel}`)
      console.log()
    })
    
    // Final stats breakdown
    console.log('\\n📊 ULTIMATE STATS:')
    console.log(`   🎵 Total unique Larry Heard videos: ${uniqueVideos.length}`)
    console.log(`   📋 Playlists scraped: ${discoveredPlaylists.length}`)
    console.log(`   🏷️  Aliases covered: 10`)
    console.log(`   🎸 Groups covered: 5`)
    console.log(`   🔍 Search strategies: ${ultimateSearchTerms.length}`)
    console.log(`   🚫 Duplicates prevented: ${duplicatesRemoved}`)
    
    console.log('\\n✨ THE MOST COMPLETE LARRY HEARD COLLECTION POSSIBLE! ✨')
    
  } catch (error) {
    console.error('❌ Ultimate scraping failed:', error instanceof Error ? error.message : 'Unknown error')
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

// Run the ultimate scraper
if (require.main === module) {
  ultimateScrapingMain().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { ultimateScrapingMain }
