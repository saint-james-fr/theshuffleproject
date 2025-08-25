export type VideoData = {
  url: string
  title: string
  videoId: string
  channel?: string
  views?: string
  duration?: string
}

export type ScrapingConfig = {
  maxResults: number
  outputFile: string
  searchQueries: string[]
}
