import { ArtistConfig } from './types'
import * as path from 'path'
import * as fs from 'fs'

export class ConfigLoader {
  private static configsPath = path.join(__dirname, '../configs')
  
  static loadArtistConfig(artistName: string): ArtistConfig {
    const configPath = path.join(this.configsPath, `${artistName.toLowerCase().replace(/\s+/g, '-')}.json`)
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found for artist: ${artistName}. Expected at: ${configPath}`)
    }
    
    try {
      const configData = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configData) as ArtistConfig
      
      // Validate required fields
      this.validateConfig(config)
      
      // Ensure output file has proper path
      if (!path.isAbsolute(config.outputFile)) {
        config.outputFile = path.join(__dirname, '../data', config.outputFile)
      }
      
      return config
    } catch (error) {
      throw new Error(`Failed to load configuration for ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  static listAvailableConfigs(): string[] {
    if (!fs.existsSync(this.configsPath)) {
      return []
    }
    
    return fs.readdirSync(this.configsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
  }
  
  private static validateConfig(config: any): asserts config is ArtistConfig {
    const requiredFields = [
      'name', 'displayName', 'mainIdentities', 'aliases', 'groups',
      'maxResults', 'maxResultsPerPlaylist', 'outputFile',
      'enhancedSearchTerms', 'playlistSearchTerms', 'styleSearchTerms',
      'performanceSearchTerms', 'collaborationSearchTerms'
    ]
    
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    
    // Validate arrays
    const arrayFields = [
      'mainIdentities', 'aliases', 'groups', 'enhancedSearchTerms',
      'playlistSearchTerms', 'styleSearchTerms', 'performanceSearchTerms',
      'collaborationSearchTerms'
    ]
    
    for (const field of arrayFields) {
      if (!Array.isArray(config[field])) {
        throw new Error(`Field ${field} must be an array`)
      }
    }
    
    // Validate numbers
    if (typeof config.maxResults !== 'number' || config.maxResults <= 0) {
      throw new Error('maxResults must be a positive number')
    }
    
    if (typeof config.maxResultsPerPlaylist !== 'number' || config.maxResultsPerPlaylist <= 0) {
      throw new Error('maxResultsPerPlaylist must be a positive number')
    }
  }
  
  static generateSearchTerms(config: ArtistConfig): string[] {
    const allTerms: string[] = []
    
    // Add main identities
    allTerms.push(...config.mainIdentities)
    
    // Add aliases
    allTerms.push(...config.aliases)
    
    // Add groups
    allTerms.push(...config.groups)
    
    // Generate enhanced search terms for each main identity
    for (const identity of config.mainIdentities) {
      for (const enhancedTerm of config.enhancedSearchTerms) {
        allTerms.push(`${identity} ${enhancedTerm}`)
      }
    }
    
    // Generate style searches for main identities
    for (const identity of config.mainIdentities) {
      for (const styleTerm of config.styleSearchTerms) {
        allTerms.push(`${identity} ${styleTerm}`)
      }
    }
    
    // Generate performance searches for main identities
    for (const identity of config.mainIdentities) {
      for (const perfTerm of config.performanceSearchTerms) {
        allTerms.push(`${identity} ${perfTerm}`)
      }
    }
    
    // Generate collaboration searches for main identities
    for (const identity of config.mainIdentities) {
      for (const collabTerm of config.collaborationSearchTerms) {
        allTerms.push(`${identity} ${collabTerm}`)
      }
    }
    
    return allTerms
  }
  
  static generatePlaylistSearchTerms(config: ArtistConfig): string[] {
    const playlistTerms: string[] = []
    
    // Generate playlist search terms for each main identity
    for (const identity of config.mainIdentities) {
      for (const playlistTerm of config.playlistSearchTerms) {
        playlistTerms.push(`${identity} ${playlistTerm}`)
      }
    }
    
    return playlistTerms
  }
}
