import { ultimateScrapingMain } from './ultimate-scraper'
import { discogsPuppeteerScrapingMain } from './discogs-puppeteer-scraper'
import { discogsRemixScrapingMain } from './discogs-remix-scraper'
import { addPlaylistMain } from './add-playlist'
import { addVideoMain } from './add-video'
import { convertCsvToVueData } from './convert-to-vue'
import { ConfigLoader } from './config-loader'

// Generic scraper runner that can work with any artist configuration
const runScraper = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (!command) {
    showUsage()
    process.exit(1)
  }
  
  switch (command) {
    case 'list':
      listConfigs()
      break
      
    case 'scrape':
      await runUltimateScraper(args[1])
      break
      
    case 'discogs':
      await runDiscogsScraper(args[1], args[2])
      break
      
    case 'discogs-remixes':
      await runDiscogsRemixScraper(args[1])
      break
      
    case 'add-playlist':
      await runAddPlaylist(args[1], args[2])
      break
      
    case 'add-video':
      await runAddVideo(args[1], args[2])
      break
      
    case 'update-vue':
      await runUpdateVue(args[1])
      break
      
    default:
      console.error(`❌ Unknown command: ${command}`)
      showUsage()
      process.exit(1)
  }
}

const showUsage = (): void => {
  console.log('🎵 Generic Music Scraper')
  console.log('========================')
  console.log('')
  console.log('Commands:')
  console.log('  list                              List available artist configurations')
  console.log('  scrape <artist-name>              Run ultimate scraper for an artist')
  console.log('  discogs <artist-name> <url>       Scrape Discogs videos for an artist')
  console.log('  discogs-remixes <artist-name>     Scrape Discogs remix credits for an artist')
  console.log('  add-playlist <artist> <url>       Add a YouTube playlist to collection')
  console.log('  add-video <artist> <url>          Add a single YouTube video to collection')
  console.log('  update-vue <artist-name>          Convert CSV data to Vue format')
  console.log('')
  console.log('Examples:')
  console.log('  yarn scraper list')
  console.log('  yarn scraper scrape larry-heard')
  console.log('  yarn scraper discogs larry-heard "https://www.discogs.com/artist/123"')
  console.log('  yarn scraper discogs-remixes ron-trent')
  console.log('  yarn scraper add-playlist larry-heard "https://www.youtube.com/playlist?list=ABC123"')
  console.log('  yarn scraper add-video larry-heard "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
  console.log('  yarn scraper update-vue larry-heard')
  console.log('')
  console.log('Note: Artist configurations are stored in ./configs/<artist-name>.json')
}

const listConfigs = (): void => {
  console.log('📋 Available artist configurations:')
  const availableConfigs = ConfigLoader.listAvailableConfigs()
  if (availableConfigs.length > 0) {
    availableConfigs.forEach(config => console.log(`   - ${config}`))
  } else {
    console.log('   No configurations found. Please create a configuration file first.')
    console.log('')
    console.log('💡 To create a new configuration:')
    console.log('   1. Copy ./configs/larry-heard.json as a template')
    console.log('   2. Modify the artist information and search terms')
    console.log('   3. Save as ./configs/<artist-name>.json')
  }
}

const runUltimateScraper = async (artistName?: string): Promise<void> => {
  if (!artistName) {
    console.error('❌ Please specify an artist name')
    console.log('📋 Available configurations:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Starting ultimate scraper for: ${artistName}`)
    await ultimateScrapingMain(artistName)
  } catch (error) {
    console.error('❌ Scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

const runDiscogsScraper = async (artistName?: string, discogsUrl?: string): Promise<void> => {
  if (!artistName) {
    console.error('❌ Please specify an artist name')
    console.log('📋 Available artists:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Starting Discogs scraper for: ${artistName}`)
    await discogsPuppeteerScrapingMain(artistName, discogsUrl)
  } catch (error) {
    console.error('❌ Discogs scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

const runDiscogsRemixScraper = async (artistName?: string): Promise<void> => {
  if (!artistName) {
    console.error('❌ Please specify an artist name')
    console.log('📋 Available artists:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Starting Discogs remix scraper for: ${artistName}`)
    await discogsRemixScrapingMain(artistName)
  } catch (error) {
    console.error('❌ Discogs remix scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

const runAddPlaylist = async (artistName?: string, playlistUrl?: string): Promise<void> => {
  if (!artistName || !playlistUrl) {
    console.error('❌ Please specify both artist name and playlist URL')
    console.log('📋 Available artists:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Adding playlist for: ${artistName}`)
    await addPlaylistMain(artistName, playlistUrl)
  } catch (error) {
    console.error('❌ Add playlist failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

const runAddVideo = async (artistName?: string, videoUrl?: string): Promise<void> => {
  if (!artistName || !videoUrl) {
    console.error('❌ Please specify both artist name and video URL')
    console.log('📋 Available artists:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Adding video for: ${artistName}`)
    await addVideoMain(artistName, videoUrl)
  } catch (error) {
    console.error('❌ Add video failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

const runUpdateVue = async (artistName?: string): Promise<void> => {
  if (!artistName) {
    console.error('❌ Please specify an artist name')
    console.log('📋 Available artists:')
    listConfigs()
    process.exit(1)
  }
  
  try {
    console.log(`🚀 Converting CSV to Vue data for: ${artistName}`)
    await convertCsvToVueData(artistName)
  } catch (error) {
    console.error('❌ Update Vue failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Run the scraper runner
if (require.main === module) {
  runScraper().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { runScraper }