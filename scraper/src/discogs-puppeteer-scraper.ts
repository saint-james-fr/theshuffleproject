import { VideoData } from "./types";
import { CSVWriter } from "./csv-writer";
import { deduplicateVideos } from "./utils";
import * as path from "path";
import * as fs from "fs";
import puppeteer from 'puppeteer';

export class DiscogsPuppeteerScraper {
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  async scrapeArtistVideos(artistUrl: string): Promise<VideoData[]> {
    console.log(`🎵 Starting Puppeteer Discogs scrape for: ${artistUrl}`);
    console.log("=".repeat(60));

    let browser;
    try {
      // Launch browser
      console.log("🚀 Launching browser...");
      browser = await puppeteer.launch({
        headless: false, // Set to false for debugging
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      console.log(`📄 Navigating to: ${artistUrl}`);
      await page.goto(artistUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for the page to load completely
      await this.sleep(2000);

      // Look for the Videos button and click it
      console.log("🔍 Looking for Videos button...");
      
      try {
        // Wait for the videos button to be available
        await page.waitForSelector('button', { timeout: 10000 });
        
        // Find and click the Videos button
        const videosButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(button => 
            button.textContent?.includes('Videos') && 
            (button.getAttribute('role') === 'radio' || button.classList.contains('selection_bYgO1'))
          );
        });

        if (videosButton) {
          console.log("✅ Found Videos button, clicking...");
          await videosButton.asElement()?.click();
          
          // Wait for the videos section to load
          await this.sleep(3000);
        } else {
          console.log("⚠️ Videos button not found, proceeding to check for existing videos section...");
        }
      } catch (error) {
        console.log("⚠️ Could not find/click Videos button, checking for existing videos section...", error instanceof Error ? error.message : "Unknown error");
      }

      // Extract videos from the page
      console.log("🎬 Extracting videos...");
      
      // Debug: Take a screenshot and log page content
      await page.screenshot({ path: 'debug-discogs-page.png', fullPage: true });
      console.log("📸 Screenshot saved as debug-discogs-page.png");
      
      // Debug: Log page title and URL
      const pageTitle = await page.title();
      const currentUrl = page.url();
      console.log(`📄 Page title: ${pageTitle}`);
      console.log(`🔗 Current URL: ${currentUrl}`);
      
      const videos = await this.extractVideosFromPage(page);

      console.log(`✅ Found ${videos.length} videos`);
      return videos;

    } catch (error) {
      console.error("❌ Puppeteer scraping failed:", error instanceof Error ? error.message : "Unknown error");
      return [];
    } finally {
      if (browser) {
        await browser.close();
        console.log("🔒 Browser closed");
      }
    }
  }

  private async extractVideosFromPage(page: any): Promise<VideoData[]> {
    const videos = await page.evaluate(() => {
      const videoList: any[] = [];
      
      // Look for the videos list container with multiple selectors
      let videosSection = document.querySelector('#release-videos');
      if (!videosSection) {
        // Try alternative selectors
        videosSection = document.querySelector('section[id*="video"]');
      }
      if (!videosSection) {
        // Look for sections containing "Videos" text
        const sections = Array.from(document.querySelectorAll('section'));
        videosSection = sections.find(section => 
          section.textContent?.includes('Videos') || 
          section.querySelector('h2')?.textContent?.includes('Videos')
        );
      }
      
      if (!videosSection) {
        console.log('No videos section found');
        // Debug: log all sections on the page
        const allSections = document.querySelectorAll('section');
        console.log(`Found ${allSections.length} sections on page`);
        allSections.forEach((section, i) => {
          console.log(`Section ${i}: id="${section.id}" class="${section.className}" text="${section.textContent?.substring(0, 100)}..."`);
        });
        return videoList;
      }

      console.log('Found videos section:', videosSection.className, videosSection.id);

      // Find all video list items with more comprehensive selectors
      let videoItems = videosSection.querySelectorAll('ul li button, li button[class*="video"], .video_oIeBc');
      
      // Fallback: look for any image with YouTube thumbnail
      if (videoItems.length === 0) {
        console.log('No video items found with primary selectors, trying fallback...');
        videoItems = videosSection.querySelectorAll('img[src*="ytimg.com"]');
        console.log(`Fallback found ${videoItems.length} YouTube images`);
      }
      
      // Even more fallback: look for any YouTube thumbnails on the entire page
      if (videoItems.length === 0) {
        console.log('Still no items, searching entire page for YouTube thumbnails...');
        videoItems = document.querySelectorAll('img[src*="ytimg.com"]');
        console.log(`Page-wide search found ${videoItems.length} YouTube images`);
      }
      
      console.log(`Found ${videoItems.length} video items`);

      videoItems.forEach((item, index) => {
        try {
          let container = item;
          
          // If item is an image, get its parent container
          if (item.tagName === 'IMG') {
            container = item.closest('button') || item.closest('li') || item.parentElement;
          }

          // Extract thumbnail URL to get video ID
          const thumbnail = container.querySelector('img[src*="ytimg.com"], img[src*="youtube.com"]') || 
                           (item.tagName === 'IMG' ? item : null) as HTMLImageElement;
          
          if (!thumbnail || !thumbnail.src) {
            console.log(`No YouTube thumbnail found for item ${index}`);
            return;
          }

          // Extract video ID from thumbnail URL
          // YouTube thumbnail URLs: https://i.ytimg.com/vi/VIDEO_ID/default.jpg
          const thumbnailMatch = thumbnail.src.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
          if (!thumbnailMatch) {
            console.log(`Could not extract video ID from thumbnail: ${thumbnail.src}`);
            return;
          }

          const videoId = thumbnailMatch[1];
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

          // Extract title - try multiple selectors
          let title = 'Unknown Title';
          const titleSelectors = [
            '.title_mKopo', 
            '[class*="title"]', 
            '.video-title',
            'div[class*="title"]'
          ];
          
          for (const selector of titleSelectors) {
            const titleElement = container.querySelector(selector);
            if (titleElement?.textContent?.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          // If no title found, try to get it from alt text or nearby text
          if (title === 'Unknown Title') {
            if (thumbnail.alt) {
              title = thumbnail.alt;
            } else {
              // Look for any text content in the container
              const textContent = container.textContent?.trim();
              if (textContent) {
                title = textContent.split('\n')[0].trim() || `Video ${index + 1}`;
              }
            }
          }

          // Extract duration
          let duration = undefined;
          const durationSelectors = [
            '.duration_II7Pz', 
            '[class*="duration"]',
            '.video-duration'
          ];
          
          for (const selector of durationSelectors) {
            const durationElement = container.querySelector(selector);
            if (durationElement?.textContent?.trim()) {
              duration = durationElement.textContent.trim();
              break;
            }
          }

          videoList.push({
            url: youtubeUrl,
            title: title,
            videoId: videoId,
            channel: "Discogs",
            duration: duration
          });

          console.log(`Extracted video ${index + 1}: ${title} (${videoId})`);
        } catch (error) {
          console.error(`Error processing video item ${index}:`, error);
        }
      });

      return videoList;
    });

    return videos;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main function to run Puppeteer Discogs scraper
const discogsPuppeteerScrapingMain = async (artistUrl: string): Promise<void> => {
  console.log("🎵 Puppeteer Discogs Artist Scraper for Larry Heard Collection");
  console.log("=".repeat(70));
  console.log(`🔗 Artist URL: ${artistUrl}`);

  const scraper = new DiscogsPuppeteerScraper();
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

    // Step 2: Scrape videos from Discogs artist page
    const discogsVideos = await scraper.scrapeArtistVideos(artistUrl);

    if (discogsVideos.length === 0) {
      console.log("❌ No YouTube videos found on Discogs artist page.");
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
    console.log("✅ PUPPETEER DISCOGS SCRAPING COMPLETED!");
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
        if (video.duration) console.log(`   ⏱️ ${video.duration}`);
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
            duration: row.Duration || undefined,
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
    console.log('   npx tsx src/discogs-puppeteer-scraper.ts "https://www.discogs.com/artist/1234-Artist-Name"');
    console.log('   yarn add-discogs-puppeteer "https://www.discogs.com/artist/1234-Artist-Name"');
    process.exit(1);
  }

  if (!artistUrl.includes("discogs.com/artist/")) {
    console.error("❌ Invalid Discogs artist URL. Please provide a valid Discogs artist URL.");
    console.log("\\n🔗 Example:");
    console.log("   https://www.discogs.com/artist/1234-Larry-Heard");
    process.exit(1);
  }

  discogsPuppeteerScrapingMain(artistUrl).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { discogsPuppeteerScrapingMain };
