import fs from "fs";
import csvParser from "csv-parser";
import _ from "lodash-es";
import natural from "natural";

const artist = process.argv[2];

if (!artist) {
  console.error("Please provide an artist name as an argument");
  process.exit(1);
}

const PATH = `scraper/data/${artist}-collection.csv`;

console.log(`Clustering ${artist}...`);

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
    "mix",
    "remix",
    "edit",
    "version",
    "feat",
    "featuring",
    "ft",
    "vs",
    "versus",
    "original",
    "extended",
    "club",
    "vocal",
    "instrumental",
    "dub",
    "live",
    "set",
    "official",
    "video",
    "hd",
    "hq",
    "remaster",
    "remastered",
    "unreleased",
    "presents",
    "pres",
    "aka",
    "featuring",
    "with",
  ]);

  async loadCsvData(csvPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: VideoRecord[] = [];
      let index = 0;

      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on("data", (data) => {
          if (data.Title && data.Title.trim()) {
            results.push({
              title: data.Title.trim(),
              url: data.URL || "",
              videoId: data["Video ID"] || "",
              channel: data.Channel || "",
              index: index++,
            });
          }
        })
        .on("end", () => {
          this.videos = results;
          console.log(`Loaded ${this.videos.length} videos from CSV`);
          resolve();
        })
        .on("error", reject);
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
    const mixInfo = mixMatches.join(" ");
    processed = processed.replace(/\([^)]*\)/g, "");

    // Extract artist and track patterns
    const artistTrackPattern = /^([^–-]+)[–-](.+)$/;
    const match = processed.match(artistTrackPattern);

    let artist = "";
    let trackName = "";

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
      .filter((word) => !this.musicStopwords.has(word) && word.length > 2)
      .map((word) => this.stemmer.stem(word));

    const core = cleanWords.join(" ");

    // Extract features like year, channel info, etc.
    const features = [
      mixInfo,
      artist.includes("ron trent") ? "ron_trent_artist" : "",
      trackName.includes("boiler room") ? "boiler_room" : "",
      title.match(/\d{4}/) ? "has_year" : "",
      title.toLowerCase().includes("live") ? "live_performance" : "",
    ].filter(Boolean);

    return { core, artist, trackName, mixInfo, features };
  }

  // TF-IDF based semantic similarity
  private buildTfIdfVectors(): void {
    this.videos.forEach((video) => {
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

  // Very strict similarity calculation - only for true duplicates
  private musicLevenshteinSimilarity(title1: string, title2: string): number {
    const processed1 = this.preprocessTitle(title1);
    const processed2 = this.preprocessTitle(title2);

    // First check: if tracks have completely different core content, don't cluster
    if (this.areCompletelyDifferentTracks(processed1, processed2)) {
      return 0;
    }

    // Only allow clustering for very similar titles (potential duplicates)
    const coreDistance = natural.LevenshteinDistance(processed1.core, processed2.core);
    const maxLen = Math.max(processed1.core.length, processed2.core.length);

    if (maxLen === 0) return 0;

    const coreSim = 1 - coreDistance / maxLen;

    // Be very strict - require very high core similarity for any clustering
    if (coreSim < 0.9) {
      return 0;
    }

    return coreSim;
  }

  // Check if tracks are completely different and should never be clustered
  private areCompletelyDifferentTracks(processed1: any, processed2: any): boolean {
    // STRICT RULE: Don't cluster tracks with same artist but different track names
    if (processed1.artist && processed2.artist && processed1.trackName && processed2.trackName) {
      // Check if artists are the same or very similar
      const artistSim =
        1 -
        natural.LevenshteinDistance(processed1.artist, processed2.artist) /
          Math.max(processed1.artist.length, processed2.artist.length);

      if (artistSim > 0.8) {
        // Same/similar artist
        const trackSim =
          1 -
          natural.LevenshteinDistance(processed1.trackName, processed2.trackName) /
            Math.max(processed1.trackName.length, processed2.trackName.length);

        // If track names are different (< 95% similar), these are different songs by same artist
        if (trackSim < 0.95) {
          return true; // Definitely different tracks
        }
      }
    }

    // Don't cluster if one has artist and other doesn't, but they seem like different tracks
    if ((processed1.artist && !processed2.artist) || (!processed1.artist && processed2.artist)) {
      const trackSim =
        1 -
        natural.LevenshteinDistance(processed1.trackName, processed2.trackName) /
          Math.max(processed1.trackName.length, processed2.trackName.length);

      // Only cluster if track names are nearly identical (potential duplicates)
      if (trackSim < 0.95) {
        return true;
      }
    }

    // Don't cluster different remix/version types - they are intentionally different
    const title1Lower = processed1.trackName.toLowerCase();
    const title2Lower = processed2.trackName.toLowerCase();

    const hasRemixTerms1 = this.hasRemixTerms(title1Lower);
    const hasRemixTerms2 = this.hasRemixTerms(title2Lower);

    // If both have remix terms but they're different types, don't cluster
    if (hasRemixTerms1 && hasRemixTerms2) {
      const remixType1 = this.extractRemixType(title1Lower);
      const remixType2 = this.extractRemixType(title2Lower);

      if (remixType1 !== remixType2 && remixType1 !== "unknown" && remixType2 !== "unknown") {
        return true; // Different remix types = intentionally different tracks
      }
    }

    // Don't cluster if one is a remix and the other isn't
    if (hasRemixTerms1 !== hasRemixTerms2) {
      return true; // One remix, one original = different
    }

    // Don't cluster multiple different versions of the same track (too many variants)
    if (hasRemixTerms1 && hasRemixTerms2) {
      const variations1 = this.countVersionVariations(title1Lower);
      const variations2 = this.countVersionVariations(title2Lower);

      // If we already have many variations, be very strict about adding more
      if (variations1 > 2 || variations2 > 2) {
        return true;
      }
    }

    return false;
  }

  private hasRemixTerms(title: string): boolean {
    const remixTerms = ["mix", "remix", "edit", "version", "vocal", "instrumental", "dub", "club"];
    return remixTerms.some((term) => title.includes(term));
  }

  private extractRemixType(title: string): string {
    const remixTerms = ["instrumental", "vocal", "club", "jazz cafe", "dub", "extended", "radio"];
    for (const term of remixTerms) {
      if (title.includes(term)) {
        return term;
      }
    }
    return "unknown";
  }

  private countVersionVariations(title: string): number {
    const variations = ["mix", "remix", "edit", "version", "vocal", "instrumental", "dub", "club", "extended"];
    return variations.filter((variation) => title.includes(variation)).length;
  }

  // Check if one processed title is a subset of another
  private isSubsetMatch(processed1: any, processed2: any): boolean {
    const tokens1 = new Set(processed1.core.split(" ").filter(Boolean));
    const tokens2 = new Set(processed2.core.split(" ").filter(Boolean));

    // Check if all tokens from the smaller set are in the larger set
    const smallerSet = tokens1.size <= tokens2.size ? tokens1 : tokens2;
    const largerSet = tokens1.size > tokens2.size ? tokens1 : tokens2;

    // Require significant overlap (at least 80% of smaller set's tokens)
    const intersection = [...smallerSet].filter((token) => largerSet.has(token));
    const overlapRatio = intersection.length / smallerSet.size;

    return overlapRatio >= 0.8 && smallerSet.size >= 2; // At least 2 meaningful tokens
  }

  // Jaccard similarity for set-based comparison
  private jaccardSimilarity(title1: string, title2: string): number {
    const tokens1 = new Set(this.preprocessTitle(title1).core.split(" "));
    const tokens2 = new Set(this.preprocessTitle(title2).core.split(" "));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Multi-algorithm clustering with hierarchical approach
  clusterVideos(): ClusterResult[] {
    console.log("Building TF-IDF vectors...");
    this.buildTfIdfVectors();

    const clusters: ClusterResult[] = [];
    const assigned = new Set<number>();

    console.log("Starting clustering analysis...");

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

        // Much more conservative ensemble scoring - only cluster clear duplicates
        const ensembleScore = tfidfSim * 0.3 + levenshteinSim * 0.5 + jaccardSim * 0.2;

        // Very high threshold - only cluster if we're very confident it's a duplicate
        const threshold = 0.85; // Much higher threshold

        // Additional strict checks
        const title1Lower = this.videos[i].title.toLowerCase();
        const title2Lower = this.videos[j].title.toLowerCase();

        // Only allow clustering for very specific duplicate scenarios
        const processed1 = this.preprocessTitle(this.videos[i].title);
        const processed2 = this.preprocessTitle(this.videos[j].title);

        // Exact track name match (like "Midi Beats" and "Gherkin Jerks - Midi Beats")
        const isExactTrackMatch =
          processed1.trackName && processed2.trackName && processed1.trackName === processed2.trackName;

        // Very similar titles (potential duplicates)
        const isVeryDuplicate = this.isVeryLikelyDuplicate(this.videos[i].title, this.videos[j].title);

        // Only cluster if we have high confidence AND it passes strict checks
        if (ensembleScore >= threshold || isExactTrackMatch || isVeryDuplicate) {
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
          confidence: avgScore,
        });
      }
    }

    return clusters.sort((a, b) => b.confidence - a.confidence);
  }

  // Only cluster if titles are very likely to be duplicates (not just similar)
  private isVeryLikelyDuplicate(title1: string, title2: string): boolean {
    // Remove common noise and compare
    const clean1 = this.cleanForDuplicateCheck(title1);
    const clean2 = this.cleanForDuplicateCheck(title2);

    // Must be very similar to be considered a duplicate
    const similarity = natural.JaroWinklerDistance(clean1, clean2);

    // Also check if one title contains the other (subset duplicate)
    const isSubset = clean1.includes(clean2) || clean2.includes(clean1);

    // Very strict: 95% similarity OR clear subset relationship
    return similarity > 0.95 || (isSubset && Math.min(clean1.length, clean2.length) > 10);
  }

  private cleanForDuplicateCheck(title: string): string {
    return title
      .toLowerCase()
      .replace(/\([^)]*\)/g, "") // Remove parentheses content
      .replace(/\[[^\]]*\]/g, "") // Remove bracket content
      .replace(/[–-]/g, " ") // Replace dashes with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  // Check if two titles belong to meaningful categories that should be clustered
  private isMeaningfulCategory(title1: string, title2: string): boolean {
    const t1 = title1.toLowerCase();
    const t2 = title2.toLowerCase();

    // Live performances and DJ sets
    const liveTerms = ["live", "set", "festival", "dekmantel", "boiler room", "dj"];
    const bothLive = liveTerms.some((term) => t1.includes(term)) && liveTerms.some((term) => t2.includes(term));

    // Interviews
    const bothInterviews = t1.includes("interview") && t2.includes("interview");

    // Same project/collaboration (like Chez Damier)
    const collaborationTerms = ["chez damier", "fingers inc", "mr white", "gherkin jerks"];
    const sameCollaboration = collaborationTerms.some((term) => t1.includes(term) && t2.includes(term));

    // Must also share similar core content (not just the category)
    if (bothLive || bothInterviews || sameCollaboration) {
      // Check if they share some meaningful words beyond just the category terms
      const words1 = t1.split(/\s+/).filter((w) => w.length > 3);
      const words2 = t2.split(/\s+/).filter((w) => w.length > 3);
      const commonWords = words1.filter((w) => words2.includes(w));

      // Need at least 2 meaningful words in common (beyond category terms)
      return commonWords.length >= 2;
    }

    return false;
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
    const titles = cluster.map((v) => v.title.toLowerCase());

    // Keep meaningful groupings
    if (titles.some((t) => t.includes("boiler room"))) {
      return "Boiler Room performances";
    }
    if (
      titles.some((t) => t.includes("live") || t.includes("set") || t.includes("festival") || t.includes("dekmantel"))
    ) {
      return "Live performances and DJ sets";
    }
    if (titles.some((t) => t.includes("interview"))) {
      return "Interviews";
    }
    if (titles.some((t) => t.includes("remaster") || t.includes("hq") || t.includes("hd"))) {
      return "Same track - different quality versions";
    }
    if (cluster.some((v) => v.channel?.includes("Topic")) && cluster.some((v) => !v.channel?.includes("Topic"))) {
      return "Same track - official vs unofficial uploads";
    }

    return "Likely duplicates";
  }

  // Enhanced output with detailed analysis
  outputResults(clusters: ClusterResult[]): void {
    console.log("\n=== ADVANCED MUSIC VIDEO CLUSTERING RESULTS ===\n");
    console.log(`Found ${clusters.length} clusters from ${this.videos.length} videos\n`);

    clusters.forEach((cluster) => {
      console.log(`📁 Cluster ${cluster.clusterId} (${cluster.videos.length} videos)`);
      console.log(`   Reason: ${cluster.reason}`);
      console.log(`   Confidence: ${(cluster.confidence * 100).toFixed(1)}%`);
      console.log("   Videos:");

      cluster.videos.forEach((video) => {
        console.log(`   • "${video.title}" (${video.channel || "Unknown"})`);
      });
      console.log("");
    });

    // Save detailed JSON results
    const outputData = {
      summary: {
        totalVideos: this.videos.length,
        clustersFound: clusters.length,
        clusteredVideos: clusters.reduce((sum, c) => sum + c.videos.length, 0),
        timestamp: new Date().toISOString(),
      },
      clusters: clusters.map((cluster) => ({
        ...cluster,
        videos: cluster.videos.map((v) => ({
          title: v.title,
          url: v.url,
          videoId: v.videoId,
          channel: v.channel,
        })),
      })),
    };

    fs.writeFileSync("advanced-clusters.json", JSON.stringify(outputData, null, 2));
    console.log("💾 Detailed results saved to advanced-clusters.json");
  }
}

// Main execution
async function main() {
  const clustering = new AdvancedMusicClustering();

  try {
    // Load data from CSV
    await clustering.loadCsvData(PATH);

    // Perform clustering
    const clusters = clustering.clusterVideos();

    // Output results
    clustering.outputResults(clusters);
  } catch (error) {
    console.error("Error during clustering:", error);
  }
}

main();
