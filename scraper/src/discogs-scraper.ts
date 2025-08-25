import { VideoData } from "./types";
import { CSVWriter } from "./csv-writer";
import { deduplicateVideos } from "./utils";
import * as path from "path";
import * as fs from "fs";
import { DiscogsVideo } from "./disconnect";
import Discogs from "disconnect";

const DiscogsClient = Discogs.Client;
const DiscogsDatabase = new DiscogsClient().database();

export class DiscogsScraper {
  private collectedVideos: VideoData[] = [];
  private db = DiscogsDatabase;

  async scrapeArtistPage(artistUrl: string): Promise<VideoData[]> {
    console.log(`🎵 Starting Discogs scrape for: ${artistUrl}`);
    console.log("=".repeat(60));

    try {
      // Extract artist ID from URL
      const artistId = this.extractArtistId(artistUrl);
      if (!artistId) {
        console.error("❌ Invalid Discogs artist URL");
        return [];
      }
      const releasesIds: string[] = [];

      const initialPage = await this.db.getArtistReleases(artistId);
      const totalPages = initialPage.pagination.pages;
      releasesIds.push(...initialPage.releases.map((release: { id: string }) => release.id));
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const pageReleases = await this.db.getArtistReleases(artistId, { page });
          releasesIds.push(...pageReleases.releases.map((release: { id: string }) => release.id));
        }
      }

      console.log(releasesIds.length, "releasesIds length");

      // Visit each release
      const videos: DiscogsVideo[] = [];

      for (const id of releasesIds) {
        console.log(`🔍 Getting release ${id}`);
        const release = await this.db.getRelease(id);
        videos.push(...release.videos);
        console.log(`pushed ${release.videos.length} videos`);
      }

      console.log(videos.length, "videos length");

      // Push the videos
      /* 
      export type VideoData = {
  url: string
  title: string
  videoId: string
  channel?: string
  views?: string
  duration?: string
} */

      const videosData = videos.map((video) => ({
        url: video.uri,
        title: video.title,
        videoId: video.uri.split("v=")[1],
        channel: "Discogs",
      }));

      //

      console.log(`\\n✅ Scraping completed!`);
      console.log(`📊 Total unique videos found: ${this.collectedVideos.length}`);

      return videosData;
    } catch (error) {
      console.error("❌ Discogs scraping failed:", error instanceof Error ? error.message : "Unknown error");
      return [];
    }
  }

  private extractArtistId(url: string): string | null {
    const match = url.match(/\/artist\/(\d+)/);
    return match ? match[1] : null;
  }
}

// Main function to run Discogs scraper
const discogsScrapingMain = async (artistUrl: string): Promise<void> => {
  console.log("🎵 Discogs Artist Scraper for Larry Heard Collection");
  console.log("=".repeat(70));
  console.log(`🔗 Artist URL: ${artistUrl}`);

  const scraper = new DiscogsScraper();
  const collectionPath = path.join(__dirname, "../data/larry-heard-collection.csv");
  const csvWriter = new CSVWriter(collectionPath);

  const allVideos: VideoData[] = [];

  try {
    // Step 1: Load existing collection
    console.log("📚 Loading existing collection...");
    if (fs.existsSync(collectionPath)) {
      const existingVideos = await loadCsvData(collectionPath);
      allVideos.push(...existingVideos);
      console.log(`✅ Loaded ${existingVideos.length} existing videos`);
    }

    // Step 2: get all Releases from artist

    const discogsVideos = await scraper.scrapeArtistPage(artistUrl);

    if (discogsVideos.length === 0) {
      console.log("❌ No YouTube videos found on Discogs pages.");
      return;
    }

    console.log(`✅ Found ${discogsVideos.length} YouTube videos from Discogs`);
    allVideos.push(...discogsVideos);

    // Step 3: Deduplication
    console.log("\\n🔄 Removing duplicates...");
    const initialCount = allVideos.length;
    const uniqueVideos = deduplicateVideos(allVideos);
    const newVideos = uniqueVideos.length - (initialCount - discogsVideos.length);
    const duplicatesRemoved = discogsVideos.length - newVideos;

    console.log(`📊 Discogs videos: ${discogsVideos.length}`);
    console.log(`📊 New videos added: ${newVideos}`);
    console.log(`🔄 Duplicates skipped: ${duplicatesRemoved}`);
    console.log(`📊 Total collection size: ${uniqueVideos.length}`);

    // Step 4: Save updated collection
    await csvWriter.writeVideos(uniqueVideos);

    console.log("\\n" + "✅".repeat(30));
    console.log("✅ DISCOGS SCRAPING COMPLETED!");
    console.log("✅".repeat(30));
    console.log(`📁 Updated: ${collectionPath}`);
    console.log(`🎵 Collection now contains ${uniqueVideos.length} unique videos`);

    if (newVideos > 0) {
      console.log("\\n🎵 Sample of newly added videos from Discogs:");
      const newlyAdded = uniqueVideos.slice(-Math.min(newVideos, 8));
      newlyAdded.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`);
        console.log(`   🔗 ${video.url}`);
        console.log(`   📺 ${video.channel}`);
        console.log();
      });
    }

    console.log(`\\n🚀 Run 'yarn update-vue' to update the Vue app with new videos!`);
  } catch (error) {
    console.error("❌ Failed to scrape Discogs:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
};

// Helper function to load existing CSV data
const loadCsvData = async (filePath: string): Promise<VideoData[]> => {
  return new Promise((resolve, reject) => {
    const videos: VideoData[] = [];
    const csv = require("csv-parser");

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: any) => {
        if (row.URL && row.Title && row["Video ID"]) {
          videos.push({
            url: row.URL,
            title: row.Title,
            videoId: row["Video ID"],
            channel: row.Channel || "Unknown",
          });
        }
      })
      .on("end", () => resolve(videos))
      .on("error", reject);
  });
};

// Run the script
if (require.main === module) {
  const artistUrl = process.argv[2];

  if (!artistUrl) {
    console.error("❌ Please provide a Discogs artist URL as an argument");
    console.log("\\n🔗 Usage:");
    console.log('   ts-node src/discogs-scraper.ts "https://www.discogs.com/artist/1234-Artist-Name"');
    console.log('   yarn add-discogs "https://www.discogs.com/artist/1234-Artist-Name"');
    process.exit(1);
  }

  if (!artistUrl.includes("discogs.com/artist/")) {
    console.error("❌ Invalid Discogs artist URL. Please provide a valid Discogs artist URL.");
    console.log("\\n🔗 Example:");
    console.log("   https://www.discogs.com/artist/1234-Larry-Heard");
    process.exit(1);
  }

  discogsScrapingMain(artistUrl).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { discogsScrapingMain };
