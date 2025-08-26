export type VideoData = {
  url: string
  title: string
  videoId: string
  channel?: string
  views?: string
  duration?: string
}

export type ArtistConfig = {
  // Artist information
  name: string
  displayName: string
  
  // Main identities and aliases
  mainIdentities: string[]
  aliases: string[]
  groups: string[]
  
  // Search configuration
  maxResults: number
  maxResultsPerPlaylist: number
  
  // File paths
  outputFile: string
  
  // Search terms
  enhancedSearchTerms: string[]
  playlistSearchTerms: string[]
  styleSearchTerms: string[]
  performanceSearchTerms: string[]
  collaborationSearchTerms: string[]
  
  // Known playlists (optional)
  knownPlaylists?: string[]
  
  // Discogs URL (optional)
  discogsUrl?: string
}

export type ScrapingConfig = {
  maxResults: number
  outputFile: string
  searchQueries: string[]
}
