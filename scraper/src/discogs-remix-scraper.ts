import { VideoData } from "./types";
import { CSVWriter } from "./csv-writer";
import { deduplicateVideos } from "./utils";
import { ConfigLoader } from "./config-loader";
import { YouTubeScraper } from "./scraper";

import * as fs from "fs";
import puppeteer from "puppeteer";

export type RemixTrack = {
  title: string;
  originalTitle?: string;
};

export type PageData = {
  pageNumber: number;
  titleCells: Array<{
    text?: string;
    links?: Array<{ text: string; href: string; type?: string }>;
  }>;
};

export type RemixScrapingConfig = {
  artistName: string;
  discogsArtistId: string;
  outputFile: string;
  maxResults?: number;
};

/**
 * DiscogsRemixScraper - Efficiently scrapes remix credits from Discogs
 *
 * This class uses Puppeteer ONLY for:
 * - Navigating Discogs pages
 * - Extracting remix track titles
 * - Handling pagination
 *
 * For YouTube searches, it delegates to the optimized YouTubeScraper class
 * which uses axios/cheerio for much better performance.
 */
export class DiscogsRemixScraper {
  private browser: any;
  private page: any;

  async initBrowser(): Promise<void> {
    console.log("🚀 Launching browser...");
    this.browser = await puppeteer.launch({
      headless: false, // Set to false for debugging
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    this.page = await this.browser.newPage();

    // Set user agent to avoid detection
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set viewport
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async scrapeRemixCredits(artistId: string, artistConfig: any): Promise<RemixTrack[]> {
    console.log(`🎵 Starting Discogs remix credits scrape for artist ID: ${artistId}`);
    console.log("=".repeat(60));

    const baseUrl = `https://www.discogs.com/artist/${artistId}?superFilter=Remix`;

    if (!this.browser) {
      await this.initBrowser();
    }

    console.log(`📄 Navigating to: ${baseUrl}`);
    await this.page.goto(baseUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for the page to load completely
    await this.sleep(2000);

    // Set items per page to maximum to reduce number of pages
    await this.setItemsPerPage();

    // PHASE 1: Visit ALL pages first to collect page data
    console.log("🔍 Phase 1: Discovering all pages...");
    const allPageData = await this.visitAllPages();

    // PHASE 2: Process all collected data to extract remix tracks
    console.log("🎵 Phase 2: Processing collected data for remix tracks...");
    const allTracks: RemixTrack[] = [];

    for (const pageData of allPageData) {
      const tracksFromPage = await this.processPageData(pageData, artistConfig);
      allTracks.push(...tracksFromPage);
    }

    console.log(`🎵 Total remix tracks found: ${allTracks.length}`);
    
    // Debug: Check specifically for Nuits Sonores
    const nuitsTrack = allTracks.find(track => 
      track.title.toLowerCase().includes('nuits sonores')
    );
    
    if (nuitsTrack) {
      console.log(`🎯 SUCCESS: Found Nuits Sonores track: "${nuitsTrack.title}"`);
    } else {
      console.log(`❌ MISSING: Nuits Sonores track not found in ${allTracks.length} extracted tracks`);
      console.log(`📝 Sample of found tracks:`);
      allTracks.slice(0, 5).forEach((track, i) => {
        console.log(`  ${i + 1}. "${track.title}"`);
      });
    }
    
    // Debug: Write all extracted tracks to tmp file for debugging
    await this.writeDebugTracks(allTracks, artistConfig.name || 'unknown');
    
    // Deduplicate tracks before returning (remove exact duplicates)
    const uniqueTracks = this.deduplicateRemixTracks(allTracks);
    const duplicatesRemoved = allTracks.length - uniqueTracks.length;
    
    if (duplicatesRemoved > 0) {
      console.log(`🗑️ Removed ${duplicatesRemoved} duplicate remix tracks (${uniqueTracks.length} unique remain)`);
    }
    
    return uniqueTracks;
  }

  private async setItemsPerPage(): Promise<void> {
    try {
      console.log("⚙️ Setting items per page to 500 to minimize pagination...");

      // Check if the select element exists
      const selectExists = await this.page.evaluate(() => {
        const selectElement = document.getElementById("show") as HTMLSelectElement;
        return selectElement !== null;
      });

      if (!selectExists) {
        console.log("⚠️ 'show' select element not found - proceeding with default pagination");
        return;
      }

      // Change the select value to 500
      const changed = await this.page.evaluate(() => {
        const selectElement = document.getElementById("show") as HTMLSelectElement;
        if (selectElement) {
          // Check if option 500 exists
          const option500 = Array.from(selectElement.options).find((option) => option.value === "500");
          if (option500) {
            selectElement.value = "500";
            // Trigger change event to update the page
            const changeEvent = new Event("change", { bubbles: true });
            selectElement.dispatchEvent(changeEvent);
            console.log("Set items per page to 500");
            return true;
          } else {
            // If 500 doesn't exist, try to find the highest value
            const maxValue = Math.max(...Array.from(selectElement.options).map((opt) => parseInt(opt.value) || 0));
            if (maxValue > 0) {
              selectElement.value = maxValue.toString();
              const changeEvent = new Event("change", { bubbles: true });
              selectElement.dispatchEvent(changeEvent);
              console.log(`Set items per page to maximum available: ${maxValue}`);
              return true;
            }
          }
        }
        return false;
      });

      if (changed) {
        console.log("⏳ Waiting for page to reload with new items per page...");
        await this.sleep(3000); // Wait for page to reload with new setting
        console.log("✅ Items per page updated successfully");

        // Now check how many pages we actually have with the new setting
        await this.detectTotalPages();
      } else {
        console.log("⚠️ Could not change items per page - proceeding with default");
      }
    } catch (error) {
      console.log("⚠️ Error setting items per page:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async detectTotalPages(): Promise<void> {
    try {
      const paginationInfo = await this.page.evaluate(() => {
        const info = {
          totalItems: 0,
          itemsPerPage: 0,
          totalPages: 0,
          currentPage: 1,
          paginationText: "",
        };

        // Look for pagination info text (e.g., "Showing 1-500 of 1,234 results")
        const paginationTexts = [
          document.querySelector(".pagination_total"),
          document.querySelector('[class*="pagination"] .pagination_total'),
          document.querySelector(".pagination-info"),
          document.querySelector('[class*="showing"]'),
          document.querySelector('[class*="results"]'),
        ];

        for (const textElement of paginationTexts) {
          if (textElement && textElement.textContent) {
            info.paginationText = textElement.textContent.trim();
            // Try to extract numbers from text like "Showing 1-500 of 1,234 results"
            const match = info.paginationText.match(/(\d+)[^\d]*(\d+)[^\d]*(\d+(?:,\d+)*)/);
            if (match) {
              info.itemsPerPage = parseInt(match[2]) - parseInt(match[1]) + 1;
              info.totalItems = parseInt(match[3].replace(/,/g, ""));
              info.totalPages = Math.ceil(info.totalItems / info.itemsPerPage);
              break;
            }
          }
        }

        // Alternative: count pagination buttons
        if (info.totalPages === 0) {
          const pageButtons = document.querySelectorAll('[class*="pagination"] button, [class*="pagination"] a');
          const pageNumbers: number[] = [];

          pageButtons.forEach((button) => {
            const text = button.textContent?.trim();
            if (text && /^\d+$/.test(text)) {
              pageNumbers.push(parseInt(text));
            }
          });

          if (pageNumbers.length > 0) {
            info.totalPages = Math.max(...pageNumbers);
          }
        }

        return info;
      });

      if (paginationInfo.totalPages > 0) {
        console.log(`📊 Pagination detected: ${paginationInfo.totalPages} total pages`);
        console.log(`📄 Items: ${paginationInfo.totalItems} total, ${paginationInfo.itemsPerPage} per page`);
        if (paginationInfo.paginationText) {
          console.log(`📝 Pagination info: "${paginationInfo.paginationText}"`);
        }
      } else {
        console.log("⚠️ Could not detect total pages - will discover during navigation");
      }
    } catch (error) {
      console.log("⚠️ Error detecting total pages:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async visitAllPages(): Promise<PageData[]> {
    const allPageData: PageData[] = [];
    let pageNumber = 1;
    let hasNextPage = true;
    let currentUrl = await this.page.url();
    const maxPages = 50; // Safety limit to prevent infinite loops

    while (hasNextPage && pageNumber <= maxPages) {
      console.log(`📄 Visiting page ${pageNumber}...`);
      console.log(`🔗 Current URL: ${currentUrl}`);

      // Extract data from current page
      const pageData = await this.extractPageData(pageNumber);
      allPageData.push(pageData);

      console.log(`✅ Collected data from page ${pageNumber} (${pageData.titleCells.length} items)`);

      // Stop if we found 0 items on this page (empty page)
      if (pageData.titleCells.length === 0) {
        console.log("🛑 Found empty page - stopping pagination");
        hasNextPage = false;
        break;
      }

      // Store current URL to compare after navigation attempt
      const previousUrl = currentUrl;

      // Check if there's a next page
      hasNextPage = await this.goToNextPage();

      if (hasNextPage) {
        // Additional wait and check if URL actually changed
        await this.sleep(2000);
        currentUrl = await this.page.url();

        // Verify we actually moved to a different page
        if (currentUrl === previousUrl) {
          console.log("⚠️ URL didn't change after clicking Next - reached last page");
          hasNextPage = false;
        } else {
          pageNumber++;
          console.log(`🔄 Moved to new page: ${currentUrl}`);
        }
      } else {
        console.log("🛑 No Next button found - reached last page");
      }
    }

    if (pageNumber > maxPages) {
      console.log(`⚠️ Reached maximum page limit (${maxPages}). There might be more pages.`);
    }

    console.log(`📚 Total pages visited: ${allPageData.length}`);
    return allPageData;
  }

  private async extractPageData(pageNumber: number): Promise<PageData> {
    // First, check for and click any versions buttons to reveal additional releases
    await this.expandVersionsIfPresent();

    const pageData = await this.page.evaluate((pageNum: number) => {
      const titleCells: Array<{
        text?: string;
        links?: Array<{ text: string; href: string }>;
      }> = [];

      // Look for table cells with class starting with "title"
      const cells = document.querySelectorAll('td[class*="title"]');

      console.log(`Page ${pageNum}: Found ${cells.length} title cells`);

      cells.forEach((cell, index) => {
        try {
          const cellData: {
            text?: string;
            links?: Array<{ text: string; href: string; type?: string }>;
          } = {};

          // Check if cell has direct text content (extract text that's directly in the cell)
          const directText =
            cell.childNodes[0]?.nodeType === Node.TEXT_NODE ? cell.childNodes[0].textContent?.trim() : null;

          // Always look for span elements with links as well
          const spans = cell.querySelectorAll("span");
          const allLinks: HTMLAnchorElement[] = [];

          spans.forEach((span) => {
            const linksInSpan = span.querySelectorAll('a[class*="link"]');
            allLinks.push(...(Array.from(linksInSpan) as HTMLAnchorElement[]));
          });

          // Case 1: Direct text content exists (like "Nuits Sonores (Ron Trent Remix)")
          if (directText && directText.length > 0) {
            cellData.text = directText;
            console.log(`Page ${pageNum}, Cell ${index + 1}: Direct text - "${directText}"`);
            
            // DEBUG: Check if this looks like the missing track
            if (directText.toLowerCase().includes('nuits sonores')) {
              console.log(`🎯 DEBUG: Found potential Nuits Sonores track: "${directText}"`);
            }
          }

          // Case 2: Links found in spans (can coexist with direct text)
          if (allLinks.length > 0) {
            cellData.links = allLinks.map((link) => ({
              text: link.textContent?.trim() || "",
              href: link.href || "",
              type:
                link.href.includes("/release/") || link.href.includes("/master/")
                  ? "release"
                  : link.href.includes("/artist/")
                  ? "artist"
                  : "other",
            }));
            const releaseCount = cellData.links.filter((l) => l.type === "release").length;
            const artistCount = cellData.links.filter((l) => l.type === "artist").length;
            console.log(
              `Page ${pageNum}, Cell ${index + 1}: Found ${
                allLinks.length
              } links (${releaseCount} release, ${artistCount} artist)`
            );
          }

          if (cellData.text || cellData.links) {
            titleCells.push(cellData);
          }
        } catch (error) {
          console.error(`Page ${pageNum}, Error processing cell ${index}:`, error);
        }
      });

      return { pageNumber: pageNum, titleCells };
    }, pageNumber);

    return pageData;
  }

  private async expandVersionsIfPresent(): Promise<void> {
    try {
      console.log("🔍 Looking for versions buttons to expand...");

      // Look for versions buttons and click them to reveal remix releases
      const versionsButtonsClicked = await this.page.evaluate(() => {
        const versionsButtons = document.querySelectorAll('button[class*="versionsButton"]');
        let clickedCount = 0;

        versionsButtons.forEach((button) => {
          const buttonText = button.textContent?.trim() || "";
          // Look for buttons that mention "credits" or "versions"
          if (buttonText.includes("credits") || buttonText.includes("versions")) {
            console.log(`Found versions button: "${buttonText}"`);
            (button as HTMLElement).click();
            clickedCount++;
          }
        });

        return clickedCount;
      });

      if (versionsButtonsClicked > 0) {
        console.log(`✅ Clicked ${versionsButtonsClicked} versions buttons`);
        // Wait for the expanded content to load
        await this.sleep(4000);
      } else {
        console.log("ℹ️ No versions buttons found on this page");
      }
    } catch (error) {
      console.log("⚠️ Error expanding versions:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async processPageData(pageData: PageData, artistConfig: any): Promise<RemixTrack[]> {
    const tracks: RemixTrack[] = [];

    console.log(`🔍 Processing ${pageData.titleCells.length} title cells from page ${pageData.pageNumber}`);
    
    for (const cellData of pageData.titleCells) {
      try {
        if (cellData.text) {
          // First case: Direct text - use this when available (like "Nuits Sonores (Ron Trent Remix)")
          console.log(`✅ Adding direct text track: "${cellData.text}"`);
          tracks.push({
            title: cellData.text,
            originalTitle: cellData.text,
          });
        } else if (cellData.links && cellData.links.length >= 1) {
          // Second case: Links - find the release/master link (not artist link)
          const releaseLink = cellData.links.find(
            (link) => link.href.includes("/release/") || link.href.includes("/master/")
          );

          if (releaseLink) {
            const linkType = releaseLink.href.includes("/master/") ? "master" : "release";
            console.log(`🔗 Visiting ${linkType} page: ${releaseLink.text}`);
            const remixTracks = await this.extractRemixFromReleasePage(releaseLink.href, artistConfig);
            tracks.push(...remixTracks);
          } else {
            console.log(
              `⚠️ No release/master link found in cell, found: ${cellData.links.map((l) => l.href).join(", ")}`
            );
          }
        }
      } catch (error) {
        console.error("Error processing cell data:", error);
      }
    }

    return tracks;
  }

  private async extractRemixFromReleasePage(releaseUrl: string, artistConfig: any): Promise<RemixTrack[]> {
    try {
      // Navigate to the release page
      await this.page.goto(releaseUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await this.sleep(500);

      // Build search terms from artist configuration
      const searchTerms: string[] = [];

      // Add main artist name parts
      const mainNameParts = artistConfig.displayName.toLowerCase().split(/[\s-]+/);
      searchTerms.push(...mainNameParts);

      // Add aliases
      if (artistConfig.aliases) {
        artistConfig.aliases.forEach((alias: string) => {
          const aliasParts = alias.toLowerCase().split(/[\s-]+/);
          searchTerms.push(...aliasParts);
        });
      }

      // Add remix aliases
      if (artistConfig.remixAliases) {
        artistConfig.remixAliases.forEach((alias: string) => {
          const aliasParts = alias.toLowerCase().split(/[\s-]+/);
          searchTerms.push(...aliasParts);
        });
      }

      // Add groups
      if (artistConfig.groups) {
        artistConfig.groups.forEach((group: string) => {
          const groupParts = group.toLowerCase().split(/[\s-]+/);
          searchTerms.push(...groupParts);
        });
      }

      // Remove duplicates and filter out common words
      const uniqueSearchTerms = [...new Set(searchTerms)]
        .filter((term) => term.length > 2) // Filter out very short terms
        .filter((term) => !["the", "and", "of", "in", "at", "to", "for", "with"].includes(term));

      console.log(`🔍 Searching release for terms: ${uniqueSearchTerms.join(", ")}`);

      // Extract remix tracks from #release-tracklist
      const remixTracks = await this.page.evaluate((searchTerms: string[]) => {
        const tracks: RemixTrack[] = [];
        const tracklistSection = document.querySelector("#release-tracklist");

        if (tracklistSection) {
          // Look for structured tracklist table with proper track rows
          const trackRows = tracklistSection.querySelectorAll('tr[data-track-position]');

          if (trackRows.length > 0) {
            console.log(`Found ${trackRows.length} structured track rows`);
            
            // Process each track row individually
            trackRows.forEach((row, index) => {
              try {
                // Extract track title from the trackTitle element
                const titleElement = row.querySelector('.trackTitle_loyWF span.trackTitle_loyWF, td.trackTitle_loyWF span');
                const trackTitle = titleElement?.textContent?.trim() || "";
                
                // Extract track position (A1, A2, B1, etc.)
                const position = row.getAttribute('data-track-position') || "";
                
                // Check for remix credits in the credits section
                const creditsElements = row.querySelectorAll('.credits_vzBtg a[href*="/artist/"]');
                const remixCredits: string[] = [];
                
                creditsElements.forEach(creditLink => {
                  const creditText = creditLink.textContent?.trim() || "";
                  remixCredits.push(creditText);
                });

                console.log(`Track ${position}: "${trackTitle}" | Credits: [${remixCredits.join(', ')}]`);

                if (trackTitle && trackTitle.length > 10) {
                  // Check if any of the remix credits match our search terms (meaning this artist remixed it)
                  const matchesArtist = searchTerms.some(term => 
                    remixCredits.some(credit => credit.toLowerCase().includes(term)) ||
                    trackTitle.toLowerCase().includes(term)
                  );

                  if (matchesArtist) {
                    tracks.push({
                      title: trackTitle,
                      originalTitle: trackTitle,
                    });
                    console.log(`✅ Found remix track: "${trackTitle}" (matched artist in credits/title)`);
                  } else {
                    console.log(`⚠️ Skipped "${trackTitle}" (no artist match in credits: [${remixCredits.join(', ')}])`);
                  }
                }
              } catch (error) {
                console.error(`Error processing track row ${index}:`, error);
              }
            });
          } else {
            // Fallback: parse text content more carefully  
            console.log("No structured track rows found, falling back to text parsing");
            const allText = tracklistSection.textContent || "";
            const lines = allText.split("\\n").filter((line) => line.trim().length > 0);

            for (const line of lines) {
              const lowerLine = line.toLowerCase();
              const trimmedLine = line.trim();

              // Skip obvious non-track lines
              if (
                trimmedLine.length < 10 ||
                trimmedLine.toLowerCase().includes("tracklist") ||
                trimmedLine.toLowerCase().includes("credits") ||
                trimmedLine.toLowerCase().includes("notes")
              ) {
                continue;
              }

              // Check if line contains any of the search terms (meaning it credits the artist)
              const matchesArtist = searchTerms.some((term) => lowerLine.includes(term));

              if (matchesArtist) {
                // Try to extract individual tracks from the line
                // Split by common separators that might indicate multiple tracks
                // Look for vinyl track numbers like A1, A2, B1, B2 followed by track titles
                const possibleTracks = trimmedLine.split(/(?=[A-Z][^\\s]*\\s*–)|(?=\\d+\\.)|(?=[A-Z]\\d+[A-Za-z])/);

                for (const possibleTrack of possibleTracks) {
                  let cleanTitle = possibleTrack.trim();

                  // Remove vinyl track numbers (A1, A2, B1, B2, etc.) and regular track numbers
                  cleanTitle = cleanTitle.replace(/^[A-Z]?\\d+\\.?\\s*/i, "");
                  
                  // Also handle vinyl format without spaces like "A1House" -> "House"
                  cleanTitle = cleanTitle.replace(/^[A-Z]\\d+([A-Z])/i, "$1");

                  // Remove duration timestamps
                  cleanTitle = cleanTitle.replace(/\\d+:\\d+/g, "").trim();

                  // Check if this cleaned title still contains artist terms (meaning it credits the artist)
                  const lowerCleanTitle = cleanTitle.toLowerCase();
                  const stillMatchesArtist = searchTerms.some((term) => lowerCleanTitle.includes(term));

                  if (stillMatchesArtist && cleanTitle.length > 10 && cleanTitle.length < 200) {
                    tracks.push({
                      title: cleanTitle,
                      originalTitle: cleanTitle,
                    });
                    console.log(`Found track: ${cleanTitle}`);
                  }
                }
              }
            }
          }
        }

        return tracks;
      }, uniqueSearchTerms);

      console.log(`✅ Found ${remixTracks.length} tracks with artist matches on release page`);
      return remixTracks;
    } catch (error) {
      console.error(`❌ Error extracting from release page ${releaseUrl}:`, error);
      return [];
    }
  }

  private async goToNextPage(): Promise<boolean> {
    try {
      // First, let's debug what pagination elements exist
      const paginationInfo = await this.page.evaluate(() => {
        const info = {
          paginationContainers: 0,
          nextButtons: 0,
          allButtons: 0,
          nextButtonTexts: [] as string[],
        };

        // Count pagination containers
        const paginationContainers = document.querySelectorAll('[class*="pagination"], [class*="Pagination"]');
        info.paginationContainers = paginationContainers.length;

        // Count all buttons and look for Next-like text
        const allButtons = document.querySelectorAll("button");
        info.allButtons = allButtons.length;

        // Look specifically in pagination areas for Next buttons
        const paginationAreas = document.querySelectorAll('[class*="pagination"], [class*="Pagination"]');

        paginationAreas.forEach((area) => {
          const buttons = area.querySelectorAll("button, a");
          buttons.forEach((button) => {
            const text = button.textContent?.trim() || "";
            // Only count as pagination Next if it's exactly "Next" or navigation symbols
            if (
              (text === "Next" || text === ">" || text === "→") &&
              !text.includes("Music") &&
              !text.includes("Label")
            ) {
              info.nextButtons++;
              info.nextButtonTexts.push(`"${text}" (disabled: ${(button as HTMLButtonElement).disabled})`);
            }
          });
        });

        // If no pagination areas found, look more broadly but with stricter criteria
        if (info.nextButtons === 0) {
          allButtons.forEach((button) => {
            const text = button.textContent?.trim() || "";
            if (
              (text === "Next" || text === ">" || text === "→") &&
              !text.includes("Music") &&
              !text.includes("Label")
            ) {
              info.nextButtons++;
              info.nextButtonTexts.push(`"${text}" (disabled: ${button.disabled})`);
            }
          });
        }

        return info;
      });

      console.log(`🔍 Pagination debug:`, paginationInfo);

      if (paginationInfo.nextButtons === 0) {
        console.log("🛑 No Next buttons detected on this page - likely the last page");
      }

      // Try to click next button
      const hasNext = await this.page.evaluate(() => {
        // Look for pagination containers first
        const paginationSelectors = [
          '[class*="pagination"]',
          '[class*="Pagination"]',
          ".pagination",
          '[data-testid*="pagination"]',
        ];

        for (const selector of paginationSelectors) {
          const containers = document.querySelectorAll(selector);
          for (const container of Array.from(containers)) {
            // Look for Next button in this container
            const buttons = container.querySelectorAll("button, a");
            for (const button of Array.from(buttons)) {
              const text = button.textContent?.trim() || "";
              // Only click pagination Next buttons, not other "Next" links
              if (
                (text === "Next" || text === ">" || text === "→") &&
                !text.includes("Music") &&
                !text.includes("Label") &&
                !button.hasAttribute("disabled") &&
                !(button as HTMLButtonElement).disabled
              ) {
                console.log(`Found pagination Next button: "${text}"`);
                (button as HTMLElement).click();
                return true;
              }
            }
          }
        }

        // Alternative: look for any enabled pagination Next button on the entire page
        const allButtons = document.querySelectorAll("button, a");
        for (const button of Array.from(allButtons)) {
          const text = button.textContent?.trim() || "";
          if (
            (text === "Next" || text === ">" || text === "→") &&
            !text.includes("Music") &&
            !text.includes("Label") &&
            !button.hasAttribute("disabled") &&
            !(button as HTMLButtonElement).disabled
          ) {
            console.log(`Found pagination Next button (global search): "${text}"`);
            (button as HTMLElement).click();
            return true;
          }
        }

        console.log("🔍 No enabled Next button found - this appears to be the last page");
        return false;
      });

      if (hasNext) {
        console.log("⏳ Waiting 3 seconds for page to load...");
        // Simple 3-second wait instead of unreliable networkidle2
        await this.sleep(3000);
        console.log("✅ Page load wait completed");
      }

      return hasNext;
    } catch (error) {
      console.log("⚠️ Error navigating to next page:", error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  // Removed - YouTube searching now handled by YouTubeScraper class

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }

  private deduplicateRemixTracks(tracks: RemixTrack[]): RemixTrack[] {
    const seen = new Set<string>();
    const uniqueTracks: RemixTrack[] = [];
    
    for (const track of tracks) {
      // Use normalized title as key (lowercase, trimmed)
      const normalizedTitle = track.title.toLowerCase().trim();
      
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        uniqueTracks.push(track);
      }
    }
    
    return uniqueTracks;
  }

  private async writeDebugTracks(tracks: RemixTrack[], artistName: string): Promise<void> {
    try {
      const debugContent = [
        `=== DEBUG: Extracted Remix Tracks for ${artistName} ===`,
        `Total tracks found: ${tracks.length}`,
        `Timestamp: ${new Date().toISOString()}`,
        '',
        '--- TRACKS ---',
        ...tracks.map((track, index) => `${index + 1}. "${track.title}"`),
        '',
        '--- END ---'
      ].join('\n');
      
      const debugFile = `debug-tracks-${artistName}-${Date.now()}.tmp`;
      await fs.promises.writeFile(debugFile, debugContent);
      console.log(`📝 Debug tracks written to: ${debugFile}`);
    } catch (error) {
      console.log('⚠️ Could not write debug file:', error);
    }
  }

  public async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main function to run Discogs remix scraper
export const discogsRemixScrapingMain = async (artistName: string): Promise<void> => {
  const scraper = new DiscogsRemixScraper();

  try {
    // Load artist configuration
    const config = ConfigLoader.loadArtistConfig(artistName);

    if (!config.discogsUrl) {
      throw new Error(`No Discogs URL found in configuration for ${artistName}`);
    }

    // Extract artist ID from Discogs URL
    const artistIdMatch = config.discogsUrl.match(/\/artist\/(\d+)-/);
    if (!artistIdMatch) {
      throw new Error(`Could not extract artist ID from Discogs URL: ${config.discogsUrl}`);
    }
    const artistId = artistIdMatch[1];

    console.log(`🎵 Discogs Remix Scraper - ${config.displayName}`);
    console.log("=".repeat(70));
    console.log(`🔗 Artist ID: ${artistId}`);

    const collectionPath = config.outputFile;
    const csvWriter = new CSVWriter(collectionPath);
    const allVideos: VideoData[] = [];

    // Step 1: Load existing collection
    console.log("📚 Loading existing collection...");
    if (fs.existsSync(collectionPath)) {
      const existingVideos = await loadCsvData(collectionPath);
      allVideos.push(...existingVideos);
      console.log(`✅ Loaded ${existingVideos.length} existing videos`);
    }

    // Step 2: Scrape remix credits from Discogs
    await scraper.initBrowser();
    const remixTracks = await scraper.scrapeRemixCredits(artistId, config);

    if (remixTracks.length === 0) {
      console.log(`❌ No remix tracks found for ${config.displayName}.`);
      await scraper.close();
      return;
    }

    console.log(`✅ Found ${remixTracks.length} remix tracks from ${config.displayName}'s Discogs credits`);

    // Step 3: Search YouTube for remix tracks using YouTubeScraper
    console.log("\\n🔍 Searching YouTube for remix tracks...");
    const maxTracks = config.maxResults || 50; // Limit to prevent overwhelming
    const tracksToSearch = remixTracks.slice(0, maxTracks);

    // Initialize YouTube scraper (much more efficient than Puppeteer for YouTube)
    const youtubeScraper = new YouTubeScraper();

    for (let i = 0; i < tracksToSearch.length; i++) {
      const track = tracksToSearch[i];
      console.log(`\\n📀 Processing track ${i + 1}/${tracksToSearch.length}: ${track.title}`);

      // Use the optimized YouTubeScraper instead of Puppeteer
      const youtubeVideos = await youtubeScraper.searchVideos(track.title, 1); // Limit to 1 video per track to avoid duplicates
      allVideos.push(...youtubeVideos);

      if (youtubeVideos.length > 0) {
        console.log(`   ✅ Found ${youtubeVideos.length} video(s)`);
      } else {
        console.log(`   ⚠️ No videos found`);
      }

      // The YouTubeScraper already includes respectful delays
    }

    await scraper.close();

    // Step 4: Deduplication
    console.log("\\n🔄 Removing duplicates...");
    const uniqueVideos = deduplicateVideos(allVideos);
    const duplicatesRemoved = allVideos.length - uniqueVideos.length;

    console.log(`📊 ${config.displayName} remix tracks processed: ${tracksToSearch.length}`);
    console.log(`📊 Total videos found: ${allVideos.length}`);
    console.log(`📊 Unique videos after deduplication: ${uniqueVideos.length}`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);

    // Step 5: Save updated collection
    await csvWriter.writeVideos(uniqueVideos);

    console.log("\\n" + "✅".repeat(30));
    console.log(`✅ ${config.displayName.toUpperCase()} REMIX SCRAPING COMPLETED!`);
    console.log("✅".repeat(30));
    console.log(`📁 Updated: ${collectionPath}`);
    console.log(`🎵 ${config.displayName} collection now contains ${uniqueVideos.length} unique videos`);

    // Show sample of remix videos
    const remixVideoSample = uniqueVideos
      .filter(
        (video) =>
          video.title.toLowerCase().includes("remix") ||
          video.title.toLowerCase().includes("mix") ||
          remixTracks.some((track) => video.title.toLowerCase().includes(track.title.toLowerCase().split(" ")[0]))
      )
      .slice(0, 8);

    if (remixVideoSample.length > 0) {
      console.log(`\\n🎵 Sample of ${config.displayName} remix videos found:`);
      remixVideoSample.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`);
        console.log(`   🔗 ${video.url}`);
        console.log(`   📺 ${video.channel}`);
        console.log();
      });
    }

    console.log(`\\n🚀 Run 'yarn scraper update-vue ${artistName}' to update the Vue app with new videos!`);
  } catch (error) {
    console.error(
      "❌ Failed to scrape Discogs remix credits:",
      error instanceof Error ? error.message : "Unknown error"
    );
    await scraper.close();
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
  const artistName = process.argv[2];

  if (!artistName) {
    console.error("❌ Please provide artist name");
    console.log("\\n🔗 Usage:");
    console.log("   npx tsx src/discogs-remix-scraper.ts <artist-name>");
    console.log('   npx tsx src/discogs-remix-scraper.ts "ron-trent"');
    console.log("\\n📝 Artist configurations are loaded from ./configs/<artist-name>.json");
    console.log("\\n📋 Available artists:");
    try {
      const configs = ConfigLoader.listAvailableConfigs();
      configs.forEach((config) => console.log(`   - ${config}`));
    } catch {
      console.log("   (No configurations found)");
    }
    process.exit(1);
  }

  discogsRemixScrapingMain(artistName).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}
