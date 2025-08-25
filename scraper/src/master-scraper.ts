import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'
import * as fs from 'fs'

const masterScrapingMain = async (): Promise<void> => {
  console.log('🎵 Larry Heard MASTER Collection Scraper')
  console.log('🚀 Combining basic searches, playlists, and album collections')
  console.log('=' .repeat(70))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(path.join(__dirname, '../data/larry-heard-master.csv'))
  
  const allVideos: VideoData[] = []
  
  // Load existing data if available
  const existingFiles = [
    path.join(__dirname, '../data/larry-heard-videos.csv'),
    path.join(__dirname, '../data/larry-heard-enhanced.csv'),
    path.join(__dirname, '../data/larry-heard-albums-playlists.csv')
  ]
  
  try {
    // Step 1: Load existing scraped data
    console.log('📚 Step 1: Loading existing scraped data...')
    for (const filePath of existingFiles) {
      if (fs.existsSync(filePath)) {
        console.log(`   📄 Loading: ${path.basename(filePath)}`)
        const existingVideos = await loadCsvData(filePath)
        allVideos.push(...existingVideos)
        console.log(`   ✅ Loaded ${existingVideos.length} videos`)
      } else {
        console.log(`   ⚠️  File not found: ${path.basename(filePath)}`)
      }
    }
    
    console.log(`📊 Total existing videos loaded: ${allVideos.length}`)
    
    // Step 2: Comprehensive playlist discovery
    console.log('\\n🔍 Step 2: Comprehensive playlist discovery...')
    
    const comprehensiveQueries = [
      // Basic searches
      'Larry Heard',
      'Mr Fingers',
      
      // Album/Collection searches  
      'Larry Heard albums',
      'Larry Heard discography',
      'Mr Fingers albums',
      'Larry Heard complete collection',
      'Larry Heard essential tracks',
      'Fingers Inc',
      
      // Style-specific searches
      'Larry Heard deep house',
      'Larry Heard Chicago house',
      'Larry Heard classic tracks',
      'Larry Heard rare tracks',
      'Larry Heard vinyl',
      'Larry Heard live',
      'Larry Heard DJ set',
      
      // Collaborative searches
      'Larry Heard remix',
      'Larry Heard collaboration',
      'Larry Heard production'
    ]
    
    // Known high-quality playlists
    const knownPlaylists = [
      'https://www.youtube.com/playlist?list=PLsfO53doee0fzd6hDScc13_DNiCXbKHl8',
      // Add more known playlists here as you discover them
    ]
    
    // Add known playlists
    knownPlaylists.forEach(playlist => {
      scraper.addSpecificPlaylist(playlist)
    })
    
    // Search and discover playlists
    for (const query of comprehensiveQueries) {
      console.log(`   🔍 "${query}"`)
      const videos = await scraper.searchPlaylistsAndVideos(query, 25)
      allVideos.push(...videos)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    console.log(`\\n📋 Discovered ${discoveredPlaylists.length} unique playlists`)
    
    // Step 3: Scrape all playlists
    console.log('\\n🎵 Step 3: Scraping all discovered playlists...')
    const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(60)
    allVideos.push(...playlistVideos)
    
    // Step 4: Final deduplication and stats
    console.log('\\n🔄 Step 4: Final processing...')
    console.log(`📊 Total videos before deduplication: ${allVideos.length}`)
    
    const uniqueVideos = deduplicateVideos(allVideos)
    const duplicatesRemoved = allVideos.length - uniqueVideos.length
    
    console.log(`🔄 Removed ${duplicatesRemoved} duplicates`)
    console.log(`📹 FINAL MASTER COLLECTION: ${uniqueVideos.length} unique videos`)
    
    // Step 5: Save master collection
    await csvWriter.writeVideos(uniqueVideos)
    
    // Final report
    console.log('\\n' + '=' .repeat(70))
    console.log('🎉 MASTER COLLECTION COMPLETE!')
    console.log('=' .repeat(70))
    console.log(`📁 Saved to: ${path.join(__dirname, '../data/larry-heard-master.csv')}`)
    console.log(`🎵 Total unique videos: ${uniqueVideos.length}`)
    console.log(`📋 Playlists scraped: ${discoveredPlaylists.length}`)
    console.log(`🔍 Search queries used: ${comprehensiveQueries.length}`)
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`)
    
    // Sample showcase
    console.log('\\n🎵 Sample from MASTER collection:')
    uniqueVideos.slice(0, 12).forEach((video, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${video.title}`)
      console.log(`    🔗 ${video.url}`)
      console.log(`    📺 ${video.channel}`)
      console.log()
    })
    
    // Show all discovered playlists
    if (discoveredPlaylists.length > 0) {
      console.log('📋 Complete playlist collection:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Master scraping failed:', error instanceof Error ? error.message : 'Unknown error')
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

// Run the master scraper
if (require.main === module) {
  masterScrapingMain().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { masterScrapingMain }
