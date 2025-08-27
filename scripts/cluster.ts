import fs from 'fs';
import csvParser from 'csv-parser';
import _ from 'lodash';
import natural from 'natural';

type VideoRecord = {
  title: string;
  url: string;
  videoId: string;
  channel?: string;
  index: number;
};

type ClusterResult = {
  clusterId: number;
  videos: VideoRecord[];
  reason: string;
  confidence: number;
};

class AdvancedMusicClustering {
  private videos: VideoRecord[] = [];
  private tfidfVectorizer: natural.TfIdf = new natural.TfIdf();
  private stemmer = natural.PorterStemmer;
  
  // Music-specific stopwords and patterns
  private musicStopwords = new Set([
    'mix', 'remix', 'edit', 'version', 'feat', 'featuring', 'ft', 'vs', 'versus',
    'original', 'extended', 'club', 'vocal', 'instrumental', 'dub', 'live', 'set',
    'official', 'video', 'hd', 'hq', 'remaster', 'remastered', 'unreleased',
    'presents', 'pres', 'aka', 'featuring', 'with'
  ]);

  async loadCsvData(csvPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: VideoRecord[] = [];
      let index = 0;
      
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data) => {
          if (data.Title && data.Title.trim()) {
            results.push({
              title: data.Title.trim(),
              url: data.URL || '',
              videoId: data['Video ID'] || '',
              channel: data.Channel || '',
              index: index++
            });
          }
        })
        .on('end', () => {
          this.videos = results;
          console.log(`Loaded ${this.videos.length} videos from CSV`);
          resolve();
        })
        .on('error', reject);
    });
  }

  // Advanced text preprocessing for music titles
  private preprocessTitle(title: string): {
    core: string;
    artist: string;
    trackName: string;
    mixInfo: string;
    features: string[];
  } {
    let processed = title.toLowerCase().trim();
    
    // Extract mix information in parentheses
    const mixMatches = processed.match(/\((.*?)\)/g) || [];
    const mixInfo = mixMatches.join(' ');
    processed = processed.replace(/\([^)]*\)/g, '');
    
    // Extract artist and track patterns
    const artistTrackPattern = /^([^–-]+)[–-](.+)$/;
    const match = processed.match(artistTrackPattern);
    
    let artist = '';
    let trackName = '';
    
    if (match) {
      artist = match[1].trim();
      trackName = match[2].trim();
    } else {
      // Fallback: treat whole title as track
      trackName = processed;
    }
    
    // Remove common music stopwords
    const cleanWords = processed
      .split(/[\s\-–&,]+/)
      .filter(word => !this.musicStopwords.has(word) && word.length > 2)
      .map(word => this.stemmer.stem(word));
    
    const core = cleanWords.join(' ');
    
    // Extract features like year, channel info, etc.
    const features = [
      mixInfo,
      artist.includes('ron trent') ? 'ron_trent_artist' : '',
      trackName.includes('boiler room') ? 'boiler_room' : '',
      title.match(/\d{4}/) ? 'has_year' : '',
      title.toLowerCase().includes('live') ? 'live_performance' : '',
    ].filter(Boolean);
    
    return { core, artist, trackName, mixInfo, features };
  }

  // TF-IDF based semantic similarity
  private buildTfIdfVectors(): void {
    this.videos.forEach(video => {
      const processed = this.preprocessTitle(video.title);
      this.tfidfVectorizer.addDocument(processed.core);
    });
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  // Levenshtein distance with music-specific weighting
  private musicLevenshteinSimilarity(title1: string, title2: string): number {
    const processed1 = this.preprocessTitle(title1);
    const processed2 = this.preprocessTitle(title2);
    
    // Weight different components differently
    const coreDistance = natural.LevenshteinDistance(processed1.core, processed2.core);
    const artistDistance = natural.LevenshteinDistance(processed1.artist, processed2.artist);
    const trackDistance = natural.LevenshteinDistance(processed1.trackName, processed2.trackName);
    
    const maxLen = Math.max(processed1.core.length, processed2.core.length);
    if (maxLen === 0) return 0;
    
    // Weighted similarity score
    const coreSim = 1 - (coreDistance / maxLen);
    const artistSim = processed1.artist && processed2.artist 
      ? 1 - (artistDistance / Math.max(processed1.artist.length, processed2.artist.length))
      : 0;
    const trackSim = processed1.trackName && processed2.trackName
      ? 1 - (trackDistance / Math.max(processed1.trackName.length, processed2.trackName.length))
      : 0;
    
    return (coreSim * 0.5) + (artistSim * 0.3) + (trackSim * 0.2);
  }

  // Jaccard similarity for set-based comparison
  private jaccardSimilarity(title1: string, title2: string): number {
    const tokens1 = new Set(this.preprocessTitle(title1).core.split(' '));
    const tokens2 = new Set(this.preprocessTitle(title2).core.split(' '));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Multi-algorithm clustering with hierarchical approach
  clusterVideos(): ClusterResult[] {
    console.log('Building TF-IDF vectors...');
    this.buildTfIdfVectors();
    
    const clusters: ClusterResult[] = [];
    const assigned = new Set<number>();
    
    console.log('Starting clustering analysis...');
    
    for (let i = 0; i < this.videos.length; i++) {
      if (assigned.has(i)) continue;
      
      const currentCluster: VideoRecord[] = [this.videos[i]];
      assigned.add(i);
      
      // Get TF-IDF vector for current video
      const vec1: number[] = [];
      this.tfidfVectorizer.tfidfs(this.preprocessTitle(this.videos[i].title).core, (j, measure) => {
        vec1[j] = measure;
      });
      
      for (let j = i + 1; j < this.videos.length; j++) {
        if (assigned.has(j)) continue;
        
        // Multi-algorithm similarity scoring
        const vec2: number[] = [];
        this.tfidfVectorizer.tfidfs(this.preprocessTitle(this.videos[j].title).core, (k, measure) => {
          vec2[k] = measure;
        });
        
        const tfidfSim = this.cosineSimilarity(vec1, vec2);
        const levenshteinSim = this.musicLevenshteinSimilarity(this.videos[i].title, this.videos[j].title);
        const jaccardSim = this.jaccardSimilarity(this.videos[i].title, this.videos[j].title);
        
        // Ensemble scoring with weights
        const ensembleScore = (tfidfSim * 0.4) + (levenshteinSim * 0.4) + (jaccardSim * 0.2);
        
        // Dynamic threshold based on title length and content
        const avgLength = (this.videos[i].title.length + this.videos[j].title.length) / 2;
        const threshold = avgLength > 50 ? 0.65 : 0.75; // Lower threshold for longer titles
        
        // Special cases for music content
        const title1Lower = this.videos[i].title.toLowerCase();
        const title2Lower = this.videos[j].title.toLowerCase();
        
        // Exact track matches with different mix versions
        const isTrackVariant = this.isTrackVariant(title1Lower, title2Lower);
        
        if (ensembleScore >= threshold || isTrackVariant) {
          currentCluster.push(this.videos[j]);
          assigned.add(j);
        }
      }
      
      // Only create cluster if more than one video
      if (currentCluster.length > 1) {
        const avgScore = this.calculateClusterConfidence(currentCluster);
        clusters.push({
          clusterId: clusters.length + 1,
          videos: currentCluster,
          reason: this.determineClusterReason(currentCluster),
          confidence: avgScore
        });
      }
    }
    
    return clusters.sort((a, b) => b.confidence - a.confidence);
  }

  private isTrackVariant(title1: string, title2: string): boolean {
    // Check for same track with different mix versions
    const mixKeywords = ['mix', 'remix', 'edit', 'version', 'dub', 'vocal', 'instrumental'];
    
    // Remove mix information and compare core titles
    let core1 = title1.replace(/\([^)]*\)/g, '').trim();
    let core2 = title2.replace(/\([^)]*\)/g, '').trim();
    
    // Remove mix keywords
    mixKeywords.forEach(keyword => {
      core1 = core1.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
      core2 = core2.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
    });
    
    const similarity = natural.JaroWinklerDistance(core1, core2);
    return similarity > 0.85;
  }

  private calculateClusterConfidence(cluster: VideoRecord[]): number {
    if (cluster.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const sim = this.musicLevenshteinSimilarity(cluster[i].title, cluster[j].title);
        totalSimilarity += sim;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private determineClusterReason(cluster: VideoRecord[]): string {
    const titles = cluster.map(v => v.title.toLowerCase());
    
    if (titles.some(t => t.includes('boiler room'))) {
      return 'Boiler Room performances';
    }
    if (titles.some(t => t.includes('remix') || t.includes('mix'))) {
      return 'Track remixes and versions';
    }
    if (titles.some(t => t.includes('live') || t.includes('set'))) {
      return 'Live performances and DJ sets';
    }
    if (titles.some(t => t.includes('chez damier'))) {
      return 'Collaborations with Chez Damier';
    }
    
    return 'Similar content';
  }

  // Enhanced output with detailed analysis
  outputResults(clusters: ClusterResult[]): void {
    console.log('\n=== ADVANCED MUSIC VIDEO CLUSTERING RESULTS ===\n');
    console.log(`Found ${clusters.length} clusters from ${this.videos.length} videos\n`);
    
    clusters.forEach(cluster => {
      console.log(`📁 Cluster ${cluster.clusterId} (${cluster.videos.length} videos)`);
      console.log(`   Reason: ${cluster.reason}`);
      console.log(`   Confidence: ${(cluster.confidence * 100).toFixed(1)}%`);
      console.log('   Videos:');
      
      cluster.videos.forEach(video => {
        console.log(`   • "${video.title}" (${video.channel || 'Unknown'})`);
      });
      console.log('');
    });
    
    // Save detailed JSON results
    const outputData = {
      summary: {
        totalVideos: this.videos.length,
        clustersFound: clusters.length,
        clusteredVideos: clusters.reduce((sum, c) => sum + c.videos.length, 0),
        timestamp: new Date().toISOString()
      },
      clusters: clusters.map(cluster => ({
        ...cluster,
        videos: cluster.videos.map(v => ({
          title: v.title,
          url: v.url,
          videoId: v.videoId,
          channel: v.channel
        }))
      }))
    };
    
    fs.writeFileSync('advanced-clusters.json', JSON.stringify(outputData, null, 2));
    console.log('💾 Detailed results saved to advanced-clusters.json');
  }
}

// Main execution
async function main() {
  const clustering = new AdvancedMusicClustering();
  
  try {
    // Load data from CSV
    await clustering.loadCsvData('scraper/data/ron-trent-collection.csv');
    
    // Perform clustering
    const clusters = clustering.clusterVideos();
    
    // Output results
    clustering.outputResults(clusters);
    
  } catch (error) {
    console.error('Error during clustering:', error);
  }
}

main();
