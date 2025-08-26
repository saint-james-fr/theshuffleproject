export type ArtistConfig = {
  name: string
  displayName: string
  dataFileName: string
  siteUrl: string
  description: string
  keywords: string[]
  socialImage: string
  twitterImage: string
  themeColor: string
}

// Load artist configuration from environment variables
const getArtistConfig = (): ArtistConfig => {
  const artistName = import.meta.env.VITE_ARTIST_NAME || 'larry-heard'
  const artistDisplayName = import.meta.env.VITE_ARTIST_DISPLAY_NAME || 'Larry Heard'
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://larry-heard.theshuffleproject.site'
  
  // Convert artist name to camelCase for data file variable name
  const dataFileName = artistName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + 'Videos'
  
  // Default configuration for Larry Heard with fallbacks
  const defaultConfig: ArtistConfig = {
    name: artistName,
    displayName: artistDisplayName,
    dataFileName: dataFileName,
    siteUrl: siteUrl,
    description: import.meta.env.VITE_ARTIST_DESCRIPTION || 
      `Discover random tracks from ${artistDisplayName}. Explore the legendary house music producer's discography with scraped YouTube and Discogs content.`,
    keywords: import.meta.env.VITE_ARTIST_KEYWORDS?.split(',') || [
      artistDisplayName, 'house music', 'deep house', 'electronic music', 'music videos', 'discography', 'shuffle project'
    ],
    socialImage: import.meta.env.VITE_SOCIAL_IMAGE || `${siteUrl}/og-image.jpg`,
    twitterImage: import.meta.env.VITE_TWITTER_IMAGE || `${siteUrl}/twitter-image.jpg`,
    themeColor: import.meta.env.VITE_THEME_COLOR || '#000000'
  }

  return defaultConfig
}

export const artistConfig = getArtistConfig()
export default artistConfig
