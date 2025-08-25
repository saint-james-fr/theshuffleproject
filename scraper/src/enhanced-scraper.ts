import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'

const enhancedScrapingMain = async (): Promise<void> => {
  console.log('🎵 Enhanced Larry Heard YouTube Scraper with Playlist Discovery')
  console.log('=' .repeat(60))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(path.join(__dirname, '../data/larry-heard-enhanced.csv'))
  
  const allVideos: VideoData[] = []
  
  try {
    // Step 1: Add the specific playlist you mentioned
    const specificPlaylist = 'https://www.youtube.com/playlist?list=PLsfO53doee0fzd6hDScc13_DNiCXbKHl8'
    scraper.addSpecificPlaylist(specificPlaylist)
    
    // Step 2: Search for "Larry Heard" and discover playlists
    console.log('🔍 Phase 1: Searching "Larry Heard" and discovering playlists...')
    const basicSearchVideos = await scraper.searchPlaylistsAndVideos('Larry Heard', 50)
    allVideos.push(...basicSearchVideos)
    
    console.log(`📊 Videos from basic search: ${basicSearchVideos.length}`)
    console.log(`📋 Discovered playlists: ${scraper.getDiscoveredPlaylists().length}`)
    
    // Show discovered playlists
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    if (discoveredPlaylists.length > 0) {
      console.log('\n📋 Discovered Playlists:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
      console.log()
    }
    
    // Step 3: Scrape all discovered playlists
    console.log('🎵 Phase 2: Scraping discovered playlists...')
    const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(40)
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
    console.log(`✅ Enhanced scraping completed successfully!`)
    console.log(`📁 Data saved to: ${path.join(__dirname, '../data/larry-heard-enhanced.csv')}`)
    console.log(`📊 Total unique videos: ${uniqueVideos.length}`)
    console.log(`📋 Playlists scraped: ${discoveredPlaylists.length}`)
    
    // Show some sample results
    console.log('\n🎵 Sample videos found:')
    uniqueVideos.slice(0, 8).forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`)
      console.log(`   🔗 ${video.url}`)
      console.log(`   📺 Channel: ${video.channel}`)
      console.log()
    })
    
    // Show playlist breakdown
    if (discoveredPlaylists.length > 0) {
      console.log('📋 Playlists that were scraped:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Run the enhanced scraper
if (require.main === module) {
  enhancedScrapingMain().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { enhancedScrapingMain }
