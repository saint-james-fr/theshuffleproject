import { CSVWriter } from './csv-writer'
import { VideoData } from './types'
import { deduplicateVideos, extractVideoId, cleanTitle } from './utils'
import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
import * as cheerio from 'cheerio'


const addVideoMain = async (videoUrl: string): Promise<void> => {
  console.log('🎵 Adding YouTube Video to Larry Heard Collection')
  console.log('=' .repeat(60))
  console.log(`🔗 Video URL: ${videoUrl}`)
  
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
    } else {
      console.log('ℹ️  No existing collection found, starting fresh')
    }
    
    // Step 2: Extract video info
    console.log('\\n🔍 Extracting video information...')
    const videoData = await extractVideoData(videoUrl)
    
    if (!videoData) {
      console.log('❌ Could not extract video information. Please check the URL.')
      return
    }
    
    console.log(`✅ Found video: "${videoData.title}"`)
    console.log(`📺 Channel: ${videoData.channel}`)
    console.log(`🆔 Video ID: ${videoData.videoId}`)
    
    // Step 3: Add to collection and check for duplicates
    allVideos.push(videoData)
    
    console.log('\\n🔄 Checking for duplicates...')
    const initialCount = allVideos.length
    const uniqueVideos = deduplicateVideos(allVideos)
    const isNewVideo = uniqueVideos.length === initialCount
    
    if (isNewVideo) {
      console.log(`✅ New video added to collection!`)
      console.log(`📊 Collection size: ${uniqueVideos.length} videos`)
    } else {
      console.log(`ℹ️  Video already exists in collection`)
      console.log(`📊 Collection size remains: ${uniqueVideos.length} videos`)
    }
    
    // Step 4: Save updated collection
    await csvWriter.writeVideos(uniqueVideos)
    
    console.log('\\n' + '✅'.repeat(20))
    if (isNewVideo) {
      console.log('✅ VIDEO SUCCESSFULLY ADDED TO COLLECTION!')
    } else {
      console.log('✅ COLLECTION VERIFIED (NO DUPLICATES)')
    }
    console.log('✅'.repeat(20))
    console.log(`📁 Updated: ${collectionPath}`)
    console.log(`🎵 Collection contains ${uniqueVideos.length} unique videos`)
    
    if (isNewVideo) {
      console.log('\\n🎵 Added video details:')
      console.log(`   Title: ${videoData.title}`)
      console.log(`   URL: ${videoData.url}`)
      console.log(`   Channel: ${videoData.channel}`)
      console.log(`   Video ID: ${videoData.videoId}`)
      
      console.log(`\\n🚀 Run 'yarn scrape' to update the Vue app with the new video!`)
    }
    
  } catch (error) {
    console.error('❌ Failed to add video:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Extract video data from YouTube URL
const extractVideoData = async (url: string): Promise<VideoData | null> => {
  try {
    const videoId = extractVideoId(url)
    if (!videoId) {
      console.error('❌ Invalid YouTube URL format')
      return null
    }
    
    console.log(`   🔍 Fetching video metadata...`)
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    const $ = cheerio.load(response.data)
    
    // Try to extract title from various sources
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="title"]').attr('content') ||
                $('title').text() ||
                'Unknown Title'
    
    // Try to extract channel name
    let channel = $('meta[property="og:video:tag"]').attr('content') ||
                  $('span[itemprop="author"] link[itemprop="name"]').attr('content') ||
                  'Unknown Channel'
    
    // Clean up title (remove " - YouTube" suffix if present)
    title = title.replace(/\\s*-\\s*YouTube\\s*$/, '').trim()
    title = cleanTitle(title)
    
    // If we couldn't get good metadata, try parsing from page content
    if (title === 'Unknown Title' || title.length < 3) {
      const scriptMatch = response.data.match(/var ytInitialPlayerResponse = ({.+?});/)
      if (scriptMatch) {
        try {
          const data = JSON.parse(scriptMatch[1])
          title = data?.videoDetails?.title || title
          channel = data?.videoDetails?.author || channel
        } catch (e) {
          // Ignore parsing errors, use what we have
        }
      }
    }
    
    return {
      url: url,
      title: cleanTitle(title),
      videoId: videoId,
      channel: channel
    }
    
  } catch (error) {
    console.error('❌ Error fetching video data:', error instanceof Error ? error.message : 'Unknown error')
    return null
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
  const videoUrl = process.argv[2]
  
  if (!videoUrl) {
    console.error('❌ Please provide a YouTube video URL as an argument')
    console.log('\\n🔗 Usage:')
    console.log('   ts-node src/add-video.ts "https://www.youtube.com/watch?v=VIDEO_ID"')
    console.log('   yarn add-video "https://www.youtube.com/watch?v=VIDEO_ID"')
    process.exit(1)
  }
  
  if (!videoUrl.includes('youtube.com/watch?v=') && !videoUrl.includes('youtu.be/')) {
    console.error('❌ Invalid video URL. Please provide a valid YouTube video URL.')
    console.log('\\n🔗 Examples:')
    console.log('   https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    console.log('   https://youtu.be/dQw4w9WgXcQ')
    process.exit(1)
  }
  
  addVideoMain(videoUrl).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { addVideoMain }
