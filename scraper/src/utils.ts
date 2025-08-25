import { VideoData } from './types'

export const extractVideoId = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return ''
}

export const cleanTitle = (title: string): string => {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\(\)\[\]]/g, '')
    .trim()
}

export const isValidYouTubeUrl = (url: string): boolean => {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)
}

export const deduplicateVideos = (videos: VideoData[]): VideoData[] => {
  const seen = new Set<string>()
  return videos.filter(video => {
    const key = video.videoId || video.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
