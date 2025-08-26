import * as fs from 'fs'
import * as path from 'path'
import { VideoData } from './types'
import { ConfigLoader } from './config-loader'

const csv = require('csv-parser')

const convertCsvToVueData = async (artistName?: string, inputFile?: string): Promise<void> => {
  const configArtist = artistName || 'larry-heard'
  
  // Load artist configuration
  const config = ConfigLoader.loadArtistConfig(configArtist)
  
  // Use the output file from the artist configuration
  const collectionPath = config.outputFile
  
  // Legacy fallback paths for Larry Heard
  const ultimatePath = path.join(__dirname, '../data/larry-heard-ultimate.csv')
  const comprehensivePath = path.join(__dirname, '../data/larry-heard-comprehensive.csv')
  const masterPath = path.join(__dirname, '../data/larry-heard-master.csv')
  const enhancedPath = path.join(__dirname, '../data/larry-heard-enhanced.csv')
  const originalPath = path.join(__dirname, '../data/larry-heard-videos.csv')
  
  let csvPath = originalPath
  if (inputFile) {
    csvPath = inputFile
  } else if (fs.existsSync(collectionPath)) {
    csvPath = collectionPath
  } else if (fs.existsSync(ultimatePath)) {
    csvPath = ultimatePath
  } else if (fs.existsSync(comprehensivePath)) {
    csvPath = comprehensivePath
  } else if (fs.existsSync(masterPath)) {
    csvPath = masterPath
  } else if (fs.existsSync(enhancedPath)) {
    csvPath = enhancedPath
  }
  const outputPath = path.join(__dirname, '../../src/data/videos.ts')
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found. Please run the scraper first.')
    return
  }
  
  const videos: VideoData[] = []
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
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
      .on('end', () => {
        try {
          const tsContent = `export type VideoData = {
  url: string
  title: string
  videoId: string
  channel?: string
}

// Auto-generated from scraped YouTube data
export const videos: VideoData[] = ${JSON.stringify(videos, null, 2)}

// Backward compatibility alias
export const larryHeardVideos = videos

// Utility function to extract video ID from YouTube URL
export const extractVideoId = (url: string): string => {
  const match = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\n?#]+)/)
  return match ? match[1] : ''
}

// Utility function to get a random starting position
export const getRandomStartIndex = (length: number): number => {
  return Math.floor(Math.random() * length)
}
`
          
          fs.writeFileSync(outputPath, tsContent)
          console.log(`✅ Successfully converted ${videos.length} videos to Vue data for ${config.displayName}`)
          console.log(`📁 Input: ${path.basename(csvPath)}`)
          console.log(`📁 Output: ${outputPath}`)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
      .on('error', reject)
  })
}

if (require.main === module) {
  const artistName = process.argv[2]
  const inputFile = process.argv[3]
  convertCsvToVueData(artistName, inputFile).catch(console.error)
}

export { convertCsvToVueData }
