import * as createCsvWriter from 'csv-writer'
import { VideoData } from './types'
import * as path from 'path'
import * as fs from 'fs'

export class CSVWriter {
  private csvWriter: any
  
  constructor(filePath: string) {
    // Ensure the directory exists
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    this.csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'title', title: 'Title' },
        { id: 'url', title: 'URL' },
        { id: 'videoId', title: 'Video ID' },
        { id: 'channel', title: 'Channel' }
      ]
    })
  }
  
  async writeVideos(videos: VideoData[]): Promise<void> {
    try {
      await this.csvWriter.writeRecords(videos)
      console.log(`✅ Successfully wrote ${videos.length} videos to CSV`)
    } catch (error) {
      console.error('❌ Error writing to CSV:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }
  
  async appendVideos(videos: VideoData[]): Promise<void> {
    try {
      // Check if file exists to determine if we need headers
      const filePath = (this.csvWriter as any).path
      const fileExists = fs.existsSync(filePath)
      
      if (!fileExists) {
        await this.writeVideos(videos)
        return
      }
      
      // For appending, we need to create a new writer without headers
      const appendWriter = createCsvWriter.createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'title', title: 'Title' },
          { id: 'url', title: 'URL' },
          { id: 'videoId', title: 'Video ID' },
          { id: 'channel', title: 'Channel' }
        ],
        append: true
      })
      
      await appendWriter.writeRecords(videos)
      console.log(`✅ Successfully appended ${videos.length} videos to CSV`)
    } catch (error) {
      console.error('❌ Error appending to CSV:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }
}
