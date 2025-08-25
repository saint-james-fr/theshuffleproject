import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'
import * as fs from 'fs'

const comprehensiveAliasScrapingMain = async (): Promise<void> => {
  console.log('🎵 Larry Heard COMPREHENSIVE Alias & Band Scraper')
  console.log('🚀 Including all aliases and group participations')
  console.log('=' .repeat(80))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(path.join(__dirname, '../data/larry-heard-comprehensive.csv'))
  
  const allVideos: VideoData[] = []
  
  // Larry Heard aliases
  const aliases = [
    'Larry Heard',
    'Mr. Fingers',
    'Mr Fingers',
    '2nd Avenew',
    'Ace "Smokin" Amy',
    'Ace Smokin Amy',
    'Blakk Society',
    'Disco-D',
    'Gherkin Jerks',
    'Loosefingers',
    'The Housefactors',
    'Trio Zero'
  ]
  
  // Groups and bands
  const groups = [
    'Fingers Inc',
    'Fingers Inc.',
    'Nightshift',
    'The It',
    'The Ram Project', 
    'Fingers N Flowers'
  ]
  
  // Combined search terms
  const allSearchTerms = [...aliases, ...groups]
  
  // Enhanced search variations for each alias/group
  const searchVariations = [
    '', // Basic name
    ' house',
    ' deep house',
    ' Chicago house',
    ' tracks',
    ' music',
    ' albums',
    ' discography',
    ' collection',
    ' classic',
    ' rare',
    ' vinyl',
    ' live',
    ' DJ set',
    ' remix'
  ]
  
  // Load existing data
  const existingFiles = [
    path.join(__dirname, '../data/larry-heard-videos.csv'),
    path.join(__dirname, '../data/larry-heard-enhanced.csv'),
    path.join(__dirname, '../data/larry-heard-albums-playlists.csv'),
    path.join(__dirname, '../data/larry-heard-master.csv')
  ]
  
  try {
    // Step 1: Load existing data
    console.log('📚 Step 1: Loading existing data...')
    for (const filePath of existingFiles) {
      if (fs.existsSync(filePath)) {
        console.log(`   📄 Loading: ${path.basename(filePath)}`)
        const existingVideos = await loadCsvData(filePath)
        allVideos.push(...existingVideos)
        console.log(`   ✅ Loaded ${existingVideos.length} videos`)
      }
    }
    console.log(`📊 Existing videos loaded: ${allVideos.length}`)
    
    // Step 2: Comprehensive alias and group searches
    console.log('\\n🔍 Step 2: Searching all aliases and groups...')
    
    let searchCount = 0
    const totalSearches = allSearchTerms.length * 3 // We'll do 3 key variations per term
    
    for (const term of allSearchTerms) {
      console.log(`\\n🎯 Searching alias/group: "${term}"`)
      
      // Priority search variations for each term
      const priorityVariations = [
        term, // Basic search
        `${term} house music`, // House music specific
        `${term} albums` // Album/collection focused
      ]
      
      for (const searchTerm of priorityVariations) {
        searchCount++
        console.log(`   [${searchCount}/${totalSearches}] 🔍 "${searchTerm}"`)
        
        const videos = await scraper.searchPlaylistsAndVideos(searchTerm, 30)
        allVideos.push(...videos)
        
        // Progress update
        if (videos.length > 0) {
          console.log(`   ✅ Found ${videos.length} videos`)
        } else {
          console.log(`   ⚪ No new videos found`)
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
    
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    console.log(`\\n📋 Total playlists discovered: ${discoveredPlaylists.length}`)
    
    // Step 3: Scrape all discovered playlists
    console.log('\\n🎵 Step 3: Scraping all discovered playlists...')
    if (discoveredPlaylists.length > 0) {
      const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(50)
      allVideos.push(...playlistVideos)
      console.log(`✅ Added ${playlistVideos.length} videos from playlists`)
    }
    
    // Step 4: Final processing
    console.log('\\n🔄 Step 4: Final deduplication and analysis...')
    console.log(`📊 Total videos before deduplication: ${allVideos.length}`)
    
    const uniqueVideos = deduplicateVideos(allVideos)
    const duplicatesRemoved = allVideos.length - uniqueVideos.length
    
    console.log(`🔄 Removed ${duplicatesRemoved} duplicates`)
    console.log(`📹 FINAL COMPREHENSIVE COLLECTION: ${uniqueVideos.length} unique videos`)
    
    // Step 5: Save comprehensive collection
    await csvWriter.writeVideos(uniqueVideos)
    
    // Final comprehensive report
    console.log('\\n' + '=' .repeat(80))
    console.log('🎉 COMPREHENSIVE ALIAS COLLECTION COMPLETE!')
    console.log('=' .repeat(80))
    console.log(`📁 Saved to: ${path.join(__dirname, '../data/larry-heard-comprehensive.csv')}`)
    console.log(`🎵 Total unique videos: ${uniqueVideos.length}`)
    console.log(`📋 Playlists discovered & scraped: ${discoveredPlaylists.length}`)
    console.log(`🔍 Search terms used: ${allSearchTerms.length}`)
    console.log(`🔄 Total searches performed: ${totalSearches}`)
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`)
    
    // Breakdown by category
    console.log('\\n🎯 Search breakdown:')
    console.log('\\n📛 Aliases searched:')
    aliases.forEach((alias, index) => {
      console.log(`   ${index + 1}. ${alias}`)
    })
    
    console.log('\\n🎸 Groups/Bands searched:')
    groups.forEach((group, index) => {
      console.log(`   ${index + 1}. ${group}`)
    })
    
    // Sample showcase
    console.log('\\n🎵 Sample from COMPREHENSIVE collection:')
    uniqueVideos.slice(0, 15).forEach((video, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${video.title}`)
      console.log(`    🔗 ${video.url}`)
      console.log(`    📺 ${video.channel}`)
      console.log()
    })
    
    // Show all discovered playlists
    if (discoveredPlaylists.length > 0) {
      console.log('📋 All discovered playlists:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
    }
    
    console.log(`\\n✨ The most complete Larry Heard collection possible!`)
    console.log(`🎵 Covering all known aliases and group participations`)
    
  } catch (error) {
    console.error('❌ Comprehensive scraping failed:', error instanceof Error ? error.message : 'Unknown error')
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

// Run the comprehensive alias scraper
if (require.main === module) {
  comprehensiveAliasScrapingMain().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { comprehensiveAliasScrapingMain }
