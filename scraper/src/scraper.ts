import axios from 'axios'
import * as cheerio from 'cheerio'
import { VideoData } from './types'
import { extractVideoId, cleanTitle, isValidYouTubeUrl, delay } from './utils'

export class YouTubeScraper {
  private readonly baseUrl = 'https://www.youtube.com'
  private readonly searchUrl = 'https://www.youtube.com/results'
  private discoveredPlaylists: Set<string> = new Set()
  
  async searchVideos(query: string, maxResults: number = 50): Promise<VideoData[]> {
    try {
      console.log(`🔍 Searching for: "${query}"`)
      
      const searchParams = new URLSearchParams({
        search_query: query,
        sp: 'EgIQAQ%253D%253D' // Filter for videos only
      })
      
      const response = await axios.get(`${this.searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      const videos = this.parseSearchResults(response.data, maxResults)
      console.log(`✅ Found ${videos.length} videos for "${query}"`)
      
      // Add delay to be respectful to YouTube's servers
      await delay(1000)
      
      return videos
    } catch (error) {
      console.error(`❌ Error searching for "${query}":`, error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }
  
  private parseSearchResults(html: string, maxResults: number): VideoData[] {
    const videos: VideoData[] = []
    
    try {
      // YouTube uses JavaScript to load content, so we need to extract from the initial data
      const scriptMatch = html.match(/var ytInitialData = ({.+?});/)
      if (!scriptMatch) {
        console.warn('⚠️  Could not find ytInitialData in response')
        return this.fallbackParsing(html, maxResults)
      }
      
      const data = JSON.parse(scriptMatch[1])
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents
      
      if (!contents) {
        console.warn('⚠️  Could not find video contents in data structure')
        return this.fallbackParsing(html, maxResults)
      }
      
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || []
        
        for (const item of items) {
          if (videos.length >= maxResults) break
          
          const videoRenderer = item?.videoRenderer
          if (!videoRenderer) continue
          
          const videoId = videoRenderer.videoId
          const title = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText
          const channel = videoRenderer.ownerText?.runs?.[0]?.text
          
          if (videoId && title) {
            videos.push({
              videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              title: cleanTitle(title),
              channel: channel || 'Unknown'
            })
          }
        }
        
        if (videos.length >= maxResults) break
      }
      
    } catch (error) {
      console.error('❌ Error parsing search results:', error instanceof Error ? error.message : 'Unknown error')
      return this.fallbackParsing(html, maxResults)
    }
    
    return videos
  }
  
  private fallbackParsing(html: string, maxResults: number): VideoData[] {
    const $ = cheerio.load(html)
    const videos: VideoData[] = []
    
    // Try to find video links in the HTML
    $('a[href*="/watch?v="]').each((_, element) => {
      if (videos.length >= maxResults) return false
      
      const href = $(element).attr('href')
      if (!href) return
      
      const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : href
      if (!isValidYouTubeUrl(fullUrl)) return
      
      const videoId = extractVideoId(fullUrl)
      if (!videoId) return
      
      const title = $(element).attr('title') || $(element).text().trim()
      if (!title || title.length < 3) return
      
      videos.push({
        videoId,
        url: fullUrl,
        title: cleanTitle(title),
        channel: 'Unknown'
      })
    })
    
    console.log(`📝 Fallback parsing found ${videos.length} videos`)
    return videos
  }
  
  async scrapePlaylist(playlistId: string, maxResults: number = 50): Promise<VideoData[]> {
    try {
      console.log(`🎵 Scraping playlist: ${playlistId}`)
      
      const playlistUrl = `${this.baseUrl}/playlist?list=${playlistId}`
      const response = await axios.get(playlistUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      const videos = this.parsePlaylistResults(response.data, maxResults)
      console.log(`✅ Found ${videos.length} videos in playlist`)
      
      await delay(1000)
      return videos
      
    } catch (error) {
      console.error(`❌ Error scraping playlist ${playlistId}:`, error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }
  
  private parsePlaylistResults(html: string, maxResults: number): VideoData[] {
    const videos: VideoData[] = []
    
    try {
      const scriptMatch = html.match(/var ytInitialData = ({.+?});/)
      if (!scriptMatch) return []
      
      const data = JSON.parse(scriptMatch[1])
      const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents
      
      if (!contents) return []
      
      for (const item of contents) {
        if (videos.length >= maxResults) break
        
        const videoRenderer = item?.playlistVideoRenderer
        if (!videoRenderer) continue
        
        const videoId = videoRenderer.videoId
        const title = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText
        
        if (videoId && title) {
          videos.push({
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: cleanTitle(title),
            channel: 'Unknown'
          })
        }
      }
      
    } catch (error) {
      console.error('❌ Error parsing playlist results:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    return videos
  }
  
  async searchPlaylistsAndVideos(query: string, maxResults: number = 50): Promise<VideoData[]> {
    try {
      console.log(`🔍 Searching for playlists and videos: "${query}"`)
      
      // First search without filters to find playlists
      const searchParams = new URLSearchParams({
        search_query: query
      })
      
      const response = await axios.get(`${this.searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      const videos = this.parseSearchResults(response.data, maxResults)
      this.extractPlaylistsFromSearch(response.data)
      
      console.log(`✅ Found ${videos.length} videos and ${this.discoveredPlaylists.size} playlists for "${query}"`)
      
      await delay(1000)
      return videos
      
    } catch (error) {
      console.error(`❌ Error searching for "${query}":`, error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }
  
  private extractPlaylistsFromSearch(html: string): void {
    try {
      const scriptMatch = html.match(/var ytInitialData = ({.+?});/)
      if (!scriptMatch) return
      
      const data = JSON.parse(scriptMatch[1])
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents
      
      if (!contents) return
      
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || []
        
        for (const item of items) {
          const playlistRenderer = item?.playlistRenderer
          if (playlistRenderer?.playlistId) {
            const playlistId = playlistRenderer.playlistId
            this.discoveredPlaylists.add(playlistId)
            console.log(`📋 Found playlist: ${playlistRenderer.title?.simpleText || 'Unknown'} (${playlistId})`)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Error extracting playlists:', error instanceof Error ? error.message : 'Unknown error')
    }
  }
  
  async scrapeAllDiscoveredPlaylists(maxResultsPerPlaylist: number = 30): Promise<VideoData[]> {
    const allVideos: VideoData[] = []
    
    console.log(`🎵 Scraping ${this.discoveredPlaylists.size} discovered playlists...`)
    
    for (const playlistId of this.discoveredPlaylists) {
      const videos = await this.scrapePlaylist(playlistId, maxResultsPerPlaylist)
      allVideos.push(...videos)
      await delay(2000) // Longer delay between playlist scrapes
    }
    
    return allVideos
  }
  
  addSpecificPlaylist(playlistUrl: string): void {
    const playlistId = this.extractPlaylistIdFromUrl(playlistUrl)
    if (playlistId) {
      this.discoveredPlaylists.add(playlistId)
      console.log(`➕ Added specific playlist: ${playlistId}`)
    }
  }
  
  private extractPlaylistIdFromUrl(url: string): string | null {
    const match = url.match(/[?&]list=([^&]+)/)
    return match ? match[1] : null
  }
  
  getDiscoveredPlaylists(): string[] {
    return Array.from(this.discoveredPlaylists)
  }
}
