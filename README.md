# Larry Heard Generator 🎵

A beautiful web application that displays random YouTube videos of Larry Heard, the legendary Chicago house music producer. Features a sleek interface with navigation controls and random positioning on each page refresh.

## Features

### 🎬 Video Player
- Embedded YouTube video player
- Responsive design with 16:9 aspect ratio
- Clean, modern interface

### 🎯 Navigation
- Previous/Next video controls
- Random shuffle functionality
- Video counter showing current position
- Disabled state handling for edge cases

### 🎨 Design
- Beautiful gradient backgrounds
- Smooth animations and hover effects
- Mobile-responsive layout
- Modern glassmorphism design elements

### 🔄 Random Positioning
- Each page refresh starts at a random video
- Ensures a fresh experience every time

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Styling**: Scoped CSS with modern design patterns
- **Scraper**: Node.js + TypeScript + Axios + Cheerio

## Getting Started

### Frontend Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

The application will be available at `http://localhost:5173/`

### YouTube Scraper

The scraper is located in the `scraper/` directory and can collect Larry Heard videos from YouTube.

```bash
cd scraper

# Install scraper dependencies
yarn install

# Run the scraper (searches YouTube and saves to CSV)
yarn scrape

# Convert CSV data to Vue.js format
yarn convert

# Or do both in one command
yarn scrape-and-convert
```

## Project Structure

```
larry-heard/
├── src/                     # Vue.js application
│   ├── components/          # Vue components
│   │   ├── YouTubePlayer.vue
│   │   └── VideoControls.vue
│   ├── composables/         # Vue composables
│   │   └── useVideoPlayer.ts
│   ├── data/               # Video data
│   │   └── videos.ts
│   └── App.vue             # Main application
├── scraper/                # YouTube scraper
│   ├── src/
│   │   ├── scraper.ts      # Main scraping logic
│   │   ├── csv-writer.ts   # CSV export functionality
│   │   ├── convert-to-vue.ts # Convert CSV to Vue data
│   │   └── index.ts        # Scraper entry point
│   └── data/               # Scraped data output
└── README.md
```

## Video Data

Videos are stored in TypeScript format with the following structure:

```typescript
type VideoData = {
  url: string      // YouTube video URL
  title: string    // Video title
  videoId: string  // YouTube video ID
  channel?: string // Channel name (optional)
}
```

## Scraper Features

- Searches multiple Larry Heard-related queries
- Extracts video metadata (title, URL, channel)
- Removes duplicate videos
- Exports to CSV format
- Rate limiting to respect YouTube's servers
- Converts data to Vue.js format

### Search Queries

The scraper searches for:
- Larry Heard
- Larry Heard house music
- Larry Heard deep house
- Mr Fingers
- Fingers Inc
- Larry Heard Chicago house
- And more...

## Development

### Adding New Videos

1. Run the scraper to collect fresh data:
   ```bash
   cd scraper && yarn scrape-and-convert
   ```

2. The Vue app will automatically use the updated video data

### Customizing the Interface

- Modify `src/components/` for UI changes
- Update `src/composables/useVideoPlayer.ts` for behavior changes
- Adjust styles in component `<style>` sections

## License

MIT

## About Larry Heard

Larry Heard, also known as Mr. Fingers, is a legendary figure in Chicago house music. His deep, soulful productions have influenced generations of electronic music producers and continue to move dance floors worldwide.

---

Enjoy exploring the timeless sounds of Larry Heard! 🎵✨