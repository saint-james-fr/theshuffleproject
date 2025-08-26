import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { ConfigLoader } from './config-loader'
import { deduplicateVideos } from './utils'
import * as path from 'path'
import * as fs from 'fs'

const addPlaylistMain = async (artistName: string, playlistUrl: string): Promise<void> => {
  const config = ConfigLoader.loadArtistConfig(artistName)
  
  console.log(`🎵 Adding YouTube Playlist to ${config.displayName} Collection`)
  console.log('=' .repeat(60))
  console.log(`🎨 Artist: ${config.displayName}`)
  console.log(`📋 Playlist URL: ${playlistUrl}`)
  
  const scraper = new YouTubeScraper()
  const collectionPath = config.outputFile
  const csvWriter = new CSVWriter(collectionPath)
  
  const allVideos: VideoData[] = []
  
  try {
    // Step 1: Load existing collection
    console.log('📚 Loading existing collection...')
    if (fs.existsSync(collectionPath)) {
      const existingVideos = await loadCsvData(collectionPath)
      allVideos.push(...existingVideos)
      console.log(`✅ Loaded ${existingVideos.length} existing videos`)
    } else {
      console.log('ℹ️  No existing collection found, starting fresh')
    }
    
    // Step 2: Extract playlist ID and scrape
    console.log('\\n🔍 Extracting playlist ID and scraping...')
    scraper.addSpecificPlaylist(playlistUrl)
    
    const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(100)
    
    if (playlistVideos.length === 0) {
      console.log('❌ No videos found in the playlist. Please check the URL.')
      return
    }
    
    console.log(`✅ Found ${playlistVideos.length} videos in playlist`)
    allVideos.push(...playlistVideos)
    
    // Step 3: Deduplication
    console.log('\\n🔄 Removing duplicates...')
    const initialCount = allVideos.length
    const uniqueVideos = deduplicateVideos(allVideos)
    const newVideos = uniqueVideos.length - (initialCount - playlistVideos.length)
    const duplicatesRemoved = playlistVideos.length - newVideos
    
    console.log(`📊 Playlist videos: ${playlistVideos.length}`)
    console.log(`📊 New videos added: ${newVideos}`)
    console.log(`🔄 Duplicates skipped: ${duplicatesRemoved}`)
    console.log(`📊 Total collection size: ${uniqueVideos.length}`)
    
    // Step 4: Save updated collection
    await csvWriter.writeVideos(uniqueVideos)
    
    console.log('\\n' + '✅'.repeat(20))
    console.log('✅ PLAYLIST SUCCESSFULLY ADDED TO COLLECTION!')
    console.log('✅'.repeat(20))
    console.log(`📁 Updated: ${collectionPath}`)
    console.log(`🎵 Collection now contains ${uniqueVideos.length} unique videos`)
    
    if (newVideos > 0) {
      console.log('\\n🎵 Sample of newly added videos:')
      const newlyAdded = uniqueVideos.slice(-Math.min(newVideos, 5))
      newlyAdded.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`)
        console.log(`   🔗 ${video.url}`)
        console.log(`   📺 ${video.channel}`)
        console.log()
      })
    }
    
    console.log(`\\n🚀 Run 'yarn scraper scrape ${artistName}' to update the Vue app with new videos!`)
    
  } catch (error) {
    console.error('❌ Failed to add playlist:', error instanceof Error ? error.message : 'Unknown error')
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
  const artistName = process.argv[2]
  const playlistUrl = process.argv[3]
  
  if (!artistName || !playlistUrl) {
    console.error('❌ Please provide both artist name and YouTube playlist URL as arguments')
    console.log('\\n📋 Usage:')
    console.log('   npx tsx src/add-playlist.ts <artist-name> "https://www.youtube.com/playlist?list=PLAYLIST_ID"')
    console.log('   yarn scraper add-playlist larry-heard "https://www.youtube.com/playlist?list=PLAYLIST_ID"')
    console.log('\\n📋 Available artists:')
    const availableConfigs = ConfigLoader.listAvailableConfigs()
    if (availableConfigs.length > 0) {
      availableConfigs.forEach(config => console.log(`   - ${config}`))
    } else {
      console.log('   No configurations found.')
    }
    process.exit(1)
  }
  
  if (!playlistUrl.includes('playlist?list=')) {
    console.error('❌ Invalid playlist URL. Please provide a valid YouTube playlist URL.')
    console.log('\\n📋 Example:')
    console.log('   https://www.youtube.com/playlist?list=PLsfO53doee0fzd6hDScc13_DNiCXbKHl8')
    process.exit(1)
  }
  
  addPlaylistMain(artistName, playlistUrl).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { addPlaylistMain }
