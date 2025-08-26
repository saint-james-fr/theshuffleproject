import { YouTubeScraper } from './scraper'
import { CSVWriter } from './csv-writer'
import { VideoData, ArtistConfig } from './types'
import { ConfigLoader } from './config-loader'
import { deduplicateVideos } from './utils'
import * as path from 'path'
import * as fs from 'fs'

const ultimateScrapingMain = async (artistName?: string): Promise<void> => {
  // Use provided artist name or default to larry-heard
  const configArtist = artistName || 'larry-heard'
  
  try {
    // Load artist configuration
    const config = ConfigLoader.loadArtistConfig(configArtist)
    
    console.log(`🎵 ULTIMATE ${config.displayName} Collection Scraper`)
    console.log('🚀 Everything: All aliases, groups, playlists, and searches')
    console.log('=' .repeat(80))
    console.log(`🎨 Artist: ${config.displayName}`)
    console.log(`📝 Config: ${configArtist}`)
    console.log(`📁 Output: ${config.outputFile}`)
    console.log('=' .repeat(80))
  
    const scraper = new YouTubeScraper()
    const csvWriter = new CSVWriter(config.outputFile)
    
    const allVideos: VideoData[] = []
    
    // Generate search terms from configuration
    const ultimateSearchTerms = ConfigLoader.generateSearchTerms(config)
    const playlistSearchTerms = ConfigLoader.generatePlaylistSearchTerms(config)
    
    // Get known playlists from configuration
    const knownPlaylists = config.knownPlaylists || []
    
    // Load existing data from current output file
    const existingFiles = [config.outputFile]
    // Step 1: Load all existing data
    console.log('📚 Step 1: Loading ALL existing data...')
    for (const filePath of existingFiles) {
      if (fs.existsSync(filePath)) {
        console.log(`   📄 Loading: ${path.basename(filePath)}`)
        const existingVideos = await loadCsvData(filePath)
        allVideos.push(...existingVideos)
        console.log(`   ✅ Loaded ${existingVideos.length} videos`)
      }
    }
    console.log(`📊 Total existing videos loaded: ${allVideos.length}`)
    
    // Step 2: Add known high-quality playlists
    console.log('\\n➕ Step 2: Adding known playlists...')
    knownPlaylists.forEach(playlist => {
      scraper.addSpecificPlaylist(playlist)
      console.log(`   ➕ Added: ${playlist}`)
    })
    
    // Step 3: Dedicated playlist discovery phase
    console.log('\\n🔍 Step 3: DEDICATED playlist discovery...')
    console.log(`📋 Searching ${playlistSearchTerms.length} playlist-specific terms...`)
    
    for (const playlistTerm of playlistSearchTerms) {
      console.log(`   📋 "${playlistTerm}"`)
      const videos = await scraper.searchPlaylistsAndVideos(playlistTerm, Math.floor(config.maxResults * 0.6))
      allVideos.push(...videos)
      if (videos.length > 0) {
        console.log(`   ✅ Found ${videos.length} videos`)
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
    
    console.log(`📋 Playlists discovered so far: ${scraper.getDiscoveredPlaylists().length}`)
    
    // Step 4: Main search phase
    console.log('\\n🔍 Step 4: Main search & additional discovery...')
    console.log(`🎯 Performing ${ultimateSearchTerms.length} comprehensive searches...`)
    
    let searchCount = 0
    for (const searchTerm of ultimateSearchTerms) {
      searchCount++
      console.log(`[${searchCount}/${ultimateSearchTerms.length}] 🔍 "${searchTerm}"`)
      
      // Search for both videos and playlists
      const videos = await scraper.searchPlaylistsAndVideos(searchTerm, config.maxResults)
      allVideos.push(...videos)
      
      if (videos.length > 0) {
        console.log(`   ✅ Found ${videos.length} videos`)
      }
      
      // Progress update every 15 searches
      if (searchCount % 15 === 0) {
        const currentPlaylists = scraper.getDiscoveredPlaylists().length
        console.log(`   📊 Progress: ${searchCount}/${ultimateSearchTerms.length} | Total playlists: ${currentPlaylists}`)
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    const discoveredPlaylists = scraper.getDiscoveredPlaylists()
    console.log(`\\n📋 TOTAL PLAYLISTS DISCOVERED: ${discoveredPlaylists.length}`)
    
    // Show all discovered playlists
    if (discoveredPlaylists.length > 0) {
      console.log('\\n📋 All discovered playlists:')
      discoveredPlaylists.forEach((playlistId, index) => {
        console.log(`   ${index + 1}. https://www.youtube.com/playlist?list=${playlistId}`)
      })
    }
    
    // Step 5: Scrape ALL discovered playlists
    console.log('\\n🎵 Step 5: Scraping ALL discovered playlists...')
    if (discoveredPlaylists.length > 0) {
      const playlistVideos = await scraper.scrapeAllDiscoveredPlaylists(config.maxResultsPerPlaylist)
      allVideos.push(...playlistVideos)
      console.log(`✅ Added ${playlistVideos.length} videos from ${discoveredPlaylists.length} playlists`)
    } else {
      console.log('⚠️  No playlists to scrape')
    }
    
    // Step 6: FINAL processing and stats
    console.log('\\n🔄 Step 6: Final deduplication and analysis...')
    console.log(`📊 TOTAL videos before deduplication: ${allVideos.length}`)
    
    const uniqueVideos = deduplicateVideos(allVideos)
    const duplicatesRemoved = allVideos.length - uniqueVideos.length
    
    console.log(`🔄 Removed ${duplicatesRemoved} duplicates`)
    console.log(`🎵 ULTIMATE COLLECTION SIZE: ${uniqueVideos.length} unique videos`)
    
    // Step 7: Save ultimate collection
    await csvWriter.writeVideos(uniqueVideos)
    
    // ULTIMATE FINAL REPORT
    console.log('\\n' + '🎉'.repeat(40))
    console.log(`🎉 ULTIMATE ${config.displayName.toUpperCase()} COLLECTION COMPLETE! 🎉`)
    console.log('🎉'.repeat(40))
    console.log(`\\n📁 Saved to: ${config.outputFile}`)
    console.log(`🎵 ULTIMATE COLLECTION: ${uniqueVideos.length} unique videos`)
    console.log(`📋 Playlists discovered & scraped: ${discoveredPlaylists.length}`)
    console.log(`🔍 Search terms used: ${ultimateSearchTerms.length}`)
    console.log(`🔄 Total searches performed: ${searchCount}`)
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`)
    console.log(`📚 Existing files processed: ${existingFiles.filter(f => fs.existsSync(f)).length}`)
    
    // Ultimate sample showcase
    console.log('\\n🎵 ULTIMATE COLLECTION SAMPLE:')
    uniqueVideos.slice(0, 20).forEach((video, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${video.title}`)
      console.log(`    🔗 ${video.url}`)
      console.log(`    📺 ${video.channel}`)
      console.log()
    })
    
    // Final stats breakdown
    console.log('\\n📊 ULTIMATE STATS:')
    console.log(`   🎵 Total unique ${config.displayName} videos: ${uniqueVideos.length}`)
    console.log(`   📋 Playlists scraped: ${discoveredPlaylists.length}`)
    console.log(`   🏷️  Aliases covered: ${config.aliases.length}`)
    console.log(`   🎸 Groups covered: ${config.groups.length}`)
    console.log(`   🔍 Search strategies: ${ultimateSearchTerms.length}`)
    console.log(`   🚫 Duplicates prevented: ${duplicatesRemoved}`)
    
    console.log(`\\n✨ THE MOST COMPLETE ${config.displayName.toUpperCase()} COLLECTION POSSIBLE! ✨`)
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Configuration file not found')) {
      console.error('❌ Configuration error:', error.message)
      console.log('\\n📋 Available configurations:')
      const availableConfigs = ConfigLoader.listAvailableConfigs()
      if (availableConfigs.length > 0) {
        availableConfigs.forEach(config => console.log(`   - ${config}`))
      } else {
        console.log('   No configurations found. Please create a configuration file first.')
      }
    } else {
      console.error('❌ Ultimate scraping failed:', error instanceof Error ? error.message : 'Unknown error')
    }
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

// Run the ultimate scraper
if (require.main === module) {
  const artistName = process.argv[2]
  
  if (artistName === '--list') {
    console.log('📋 Available artist configurations:')
    const availableConfigs = ConfigLoader.listAvailableConfigs()
    if (availableConfigs.length > 0) {
      availableConfigs.forEach(config => console.log(`   - ${config}`))
    } else {
      console.log('   No configurations found. Please create a configuration file first.')
    }
    process.exit(0)
  }
  
  ultimateScrapingMain(artistName).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { ultimateScrapingMain }
