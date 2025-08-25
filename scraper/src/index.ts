import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData, ScrapingConfig } from './types'
import { deduplicateVideos } from './utils'
import * as path from 'path'

const config: ScrapingConfig = {
  maxResults: 100,
  outputFile: path.join(__dirname, '../data/larry-heard-videos.csv'),
  searchQueries: [
    'Larry Heard',
    'Larry Heard house music',
    'Larry Heard deep house',
    'Larry Heard Mr Fingers',
    'Mr Fingers',
    'Mr Fingers house',
    'Larry Heard classic',
    'Larry Heard Chicago house',
    'Larry Heard acid house',
    'Larry Heard minimal',
    'Fingers Inc',
    'Larry Heard remix'
  ]
}

const main = async (): Promise<void> => {
  console.log('🎵 Starting Larry Heard YouTube Scraper')
  console.log('=' .repeat(50))
  
  const scraper = new YouTubeScraper()
  const csvWriter = new CSVWriter(config.outputFile)
  
  const allVideos: VideoData[] = []
  
  try {
    // Search for videos with different queries
    for (const query of config.searchQueries) {
      const videos = await scraper.searchVideos(query, config.maxResults)
      allVideos.push(...videos)
      
      console.log(`📊 Total videos collected so far: ${allVideos.length}`)
      
      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Remove duplicates
    const uniqueVideos = deduplicateVideos(allVideos)
    console.log(`🔄 Removed ${allVideos.length - uniqueVideos.length} duplicates`)
    console.log(`📹 Final count: ${uniqueVideos.length} unique videos`)
    
    // Write to CSV
    await csvWriter.writeVideos(uniqueVideos)
    
    console.log('=' .repeat(50))
    console.log(`✅ Scraping completed successfully!`)
    console.log(`📁 Data saved to: ${config.outputFile}`)
    console.log(`📊 Total videos: ${uniqueVideos.length}`)
    
    // Show some sample results
    console.log('\n🎵 Sample videos found:')
    uniqueVideos.slice(0, 5).forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`)
      console.log(`   🔗 ${video.url}`)
      console.log(`   📺 Channel: ${video.channel}`)
      console.log()
    })
    
  } catch (error) {
    console.error('❌ Scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Run the scraper
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { YouTubeScraper, CSVWriter }
