import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'

const albumPlaylistScrapingMain = async (): Promise<void> => {
  console.log('🎵 Larry Heard Album & Playlist Explorer')
  console.log('=' .repeat(60))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(path.join(__dirname, '../data/larry-heard-albums-playlists.csv'))
  
  const allVideos: VideoData[] = []
  
  // Specific high-quality playlists and album searches
  const playlistQueries = [
    'Larry Heard albums',
    'Larry Heard discography',
    'Mr Fingers albums',
    'Larry Heard complete',
    'Larry Heard collection',
    'Larry Heard best of',
    'Mr Fingers discography',
    'Larry Heard essential',
    'Fingers Inc albums',
    'Larry Heard greatest hits',
    'Mr Fingers best tracks',
    'Larry Heard compilation'
  ]
  
  // Known high-quality playlists (you can add more as you discover them)
  const specificPlaylists = [
    'https://www.youtube.com/playlist?list=PLsfO53doee0fzd6hDScc13_DNiCXbKHl8', // Your original playlist
    // Add more specific playlists here as you find them
  ]
  
  try {
    // Step 1: Add specific known playlists
    console.log('➕ Adding specific known playlists...')
    specificPlaylists.forEach(playlist => {
      scraper.addSpecificPlaylist(playlist)
    })
    
    // Step 2: Search for album/collection playlists
    console.log('🔍 Phase 1: Discovering album and collection playlists...')
    for (const query of playlistQueries) {
      console.log(`   🔍 Searching: "${query}"`)
      const videos = await scraper.searchPlaylistsAndVideos(query, 30) // Fewer videos per search, focus on playlist discovery
      allVideos.push(...videos)
      
      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    console.log(`📊 Videos from searches: ${allVideos.length}`)
    console.log(`📋 Total discovered playlists: ${discoveredPlaylists.length}`)
    
    // Show discovered playlists
    if (discoveredPlaylists.length > 0) {
      console.log('\\n📋 All Discovered Playlists:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
      console.log()
    }
    
    // Step 3: Scrape all discovered playlists
    console.log('🎵 Phase 2: Scraping all discovered playlists...')
    const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(50) // More videos per playlist
    allVideos.push(...playlistVideos)
    
    console.log(`📊 Videos from playlists: ${playlistVideos.length}`)
    console.log(`📊 Total videos before deduplication: ${allVideos.length}`)
    
    // Step 4: Remove duplicates
    const uniqueVideos = deduplicateVideos(allVideos)
    console.log(`🔄 Removed ${allVideos.length - uniqueVideos.length} duplicates`)
    console.log(`📹 Final count: ${uniqueVideos.length} unique videos`)
    
    // Step 5: Write to CSV
    await csvWriter.writeVideos(uniqueVideos)
    
    console.log('=' .repeat(60))
    console.log(`✅ Album & Playlist scraping completed successfully!`)
    console.log(`📁 Data saved to: ${path.join(__dirname, '../data/larry-heard-albums-playlists.csv')}`)
    console.log(`📊 Total unique videos: ${uniqueVideos.length}`)
    console.log(`📋 Playlists scraped: ${discoveredPlaylists.length}`)
    
    // Show some sample results
    console.log('\\n🎵 Sample videos found:')
    uniqueVideos.slice(0, 10).forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`)
      console.log(`   🔗 ${video.url}`)
      console.log(`   📺 Channel: ${video.channel}`)
      console.log()
    })
    
    // Show breakdown by search type
    console.log('🔍 Search queries used for playlist discovery:')
    playlistQueries.forEach((query, index) => {
      console.log(`   ${index + 1}. "${query}"`)
    })
    
    console.log('\\n📋 Final playlist collection:')
    discoveredPlaylists.forEach((playlistId, index) => {
      console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
    })
    
    // Show stats
    console.log('\\n📊 Collection Statistics:')
    console.log(`   🎵 Total unique videos: ${uniqueVideos.length}`)
    console.log(`   📋 Playlists discovered: ${discoveredPlaylists.length}`)
    console.log(`   🔍 Search queries used: ${playlistQueries.length}`)
    console.log(`   ➕ Manual playlists added: ${specificPlaylists.length}`)
    
  } catch (error) {
    console.error('❌ Album & Playlist scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Run the album/playlist scraper
if (require.main === module) {
  albumPlaylistScrapingMain().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { albumPlaylistScrapingMain }
