# The Shuffle Project

A generic music artist discovery platform that scrapes YouTube and Discogs to create interactive shuffle experiences for any music artist.

## Features

- 🎵 **Artist-Agnostic**: Configure for any music artist
- 🔀 **Shuffle Experience**: Random track discovery with infinite playback
- 📊 **Comprehensive Scraping**: YouTube videos and Discogs integration
- 🐳 **Docker Support**: Easy deployment with environment-based builds
- 🎨 **Customizable**: Per-artist branding and configuration
- 📱 **Responsive**: Works on desktop and mobile

## Quick Start

### 1. Set up for an Artist

```bash
# Install dependencies
yarn install
cd scraper && yarn install && cd ..

# List available artist configurations
yarn scraper list

# Build for Larry Heard (default)
yarn build-for-artist larry-heard

# Build for Frankie Knuckles
yarn build-for-artist frankie-knuckles
```

### 2. Development

```bash
# Copy environment config for development
cp env-configs/larry-heard.env .env

# Start development server
yarn dev
```

### 3. Docker Deployment

```bash
# Build Docker image for specific artist
yarn docker-build larry-heard

# Run the container
docker run -p 80:80 shuffle-larry-heard:latest
```

## Adding a New Artist

### 1. Create Scraper Configuration

Create `scraper/configs/artist-name.json`:

```json
{
  "name": "artist-name",
  "displayName": "Artist Name",
  "mainIdentities": ["Artist Name", "Alternative Name"],
  "aliases": ["Alias 1", "Alias 2"],
  "groups": ["Group Name"],
  "maxResults": 35,
  "maxResultsPerPlaylist": 80,
  "outputFile": "artist-name-collection.csv",
  "enhancedSearchTerms": ["albums", "discography", "collection"],
  "playlistSearchTerms": ["playlist", "mix playlist"],
  "styleSearchTerms": ["house music", "electronic"],
  "performanceSearchTerms": ["live", "DJ set"],
  "collaborationSearchTerms": ["remix", "featuring"],
  "knownPlaylists": [],
  "discogsUrl": "https://www.discogs.com/artist/123-Artist-Name"
}
```

### 2. Create Frontend Configuration

Create `env-configs/artist-name.env`:

```bash
VITE_ARTIST_NAME=artist-name
VITE_ARTIST_DISPLAY_NAME=Artist Name
VITE_SITE_URL=https://artist-name.theshuffleproject.site
VITE_ARTIST_DESCRIPTION=Discover random tracks from Artist Name...
VITE_ARTIST_KEYWORDS=Artist Name,genre,music,videos
VITE_SOCIAL_IMAGE=https://artist-name.theshuffleproject.site/og-image.jpg
VITE_TWITTER_IMAGE=https://artist-name.theshuffleproject.site/twitter-image.jpg
VITE_THEME_COLOR=#000000
```

### 3. Create Custom Assets (Optional)

```bash
# Copy default assets as starting point
cp -r public-assets/default public-assets/artist-name

# Customize favicons, social media images, etc.
# See ASSETS.md for detailed guide
```

### 4. Scrape Data

```bash
# Scrape data for the new artist
yarn scraper scrape artist-name

# Or scrape from Discogs
yarn scraper discogs artist-name "https://www.discogs.com/artist/123"
```

### 5. Build & Deploy

```bash
# Build frontend for the artist
yarn build-for-artist artist-name

# Or build Docker image
yarn docker-build artist-name
```

## Project Structure

```
├── src/                          # Frontend Vue.js application
│   ├── components/              # Vue components
│   ├── composables/             # Vue composables
│   ├── config/                  # Artist configuration
│   └── data/                    # Generated video data
├── scraper/                     # Backend scraping system
│   ├── src/                     # TypeScript scraper code
│   ├── configs/                 # Artist scraper configurations
│   └── data/                    # Scraped CSV data
├── env-configs/                 # Environment configurations per artist
├── public-assets/               # Artist-specific assets (favicons, images)
├── templates/                   # HTML and manifest templates
├── scripts/                     # Build and deployment scripts
└── ASSETS.md                    # Asset management guide
```

## Scraper Commands

```bash
# List available artist configurations
yarn scraper list

# Run ultimate scraper for an artist
yarn scraper scrape <artist-name>

# Scrape from Discogs
yarn scraper discogs <artist-name> <discogs-url>

# Convert CSV to Vue data
cd scraper && npx tsx src/convert-to-vue.ts <artist-name>
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ARTIST_NAME` | URL-safe artist name | `larry-heard` |
| `VITE_ARTIST_DISPLAY_NAME` | Human-readable name | `Larry Heard` |
| `VITE_SITE_URL` | Full site URL | `https://larry-heard.site` |
| `VITE_ARTIST_DESCRIPTION` | SEO description | `Discover tracks from...` |
| `VITE_ARTIST_KEYWORDS` | SEO keywords (comma-separated) | `house,music,deep` |
| `VITE_SOCIAL_IMAGE` | Open Graph image URL | `https://site.com/og.jpg` |
| `VITE_TWITTER_IMAGE` | Twitter card image URL | `https://site.com/tw.jpg` |
| `VITE_THEME_COLOR` | App theme color | `#000000` |

## Docker Build Arguments

When building Docker images, you can pass environment variables as build arguments:

```bash
docker build \
  --build-arg VITE_ARTIST_NAME="frankie-knuckles" \
  --build-arg VITE_ARTIST_DISPLAY_NAME="Frankie Knuckles" \
  --build-arg VITE_SITE_URL="https://frankie-knuckles.site" \
  -t shuffle-frankie-knuckles .
```

## Architecture

### Scraper System
- **Config-driven**: JSON configurations define search strategies per artist
- **Multi-source**: YouTube search + playlist discovery + Discogs integration
- **Deduplication**: Automatic removal of duplicate videos
- **Export**: CSV output with Vue.js data generation

### Frontend System
- **Environment-based**: Build-time configuration through environment variables
- **Generic components**: No hardcoded artist references
- **Dynamic branding**: Title, descriptions, and SEO adapted per artist
- **Responsive design**: Mobile-first approach

### Deployment
- **Multi-stage Docker**: Optimized production builds
- **Environment injection**: Runtime configuration through build args
- **Static serving**: Nginx-based serving for optimal performance

## Development

### Prerequisites
- Node.js 20+ or 22+
- Yarn package manager
- Docker (for containerized builds)

### Local Development
1. Install dependencies: `yarn install`
2. Set up scraper: `cd scraper && yarn install`
3. Create environment: `cp env-configs/larry-heard.env .env`
4. Start dev server: `yarn dev`

### Adding New Search Strategies
Modify the artist configuration in `scraper/configs/artist-name.json`:
- Add to `aliases` for alternative artist names
- Add to `groups` for band/collaboration names  
- Customize `styleSearchTerms` for genre-specific searches
- Add `knownPlaylists` for high-quality curated content

## Deployment Examples

### Basic Deployment
```bash
# Build for production
yarn build-for-artist larry-heard

# Serve static files
npx serve dist
```

### Docker Deployment
```bash
# Build image
yarn docker-build larry-heard production

# Run container
docker run -d -p 80:80 --name shuffle-larry shuffle-larry-heard:production
```

### Multi-Artist Deployment
```bash
# Build multiple artists
for artist in larry-heard frankie-knuckles; do
  yarn docker-build $artist
done

# Deploy with different ports
docker run -d -p 8001:80 shuffle-larry-heard:latest
docker run -d -p 8002:80 shuffle-frankie-knuckles:latest
```

## Contributing

1. Fork the repository
2. Create artist configuration in `scraper/configs/`
3. Add environment config in `env-configs/`
4. Test scraping and building
5. Submit pull request

## License

MIT License - feel free to use for any music artist discovery project.


# List available artists
yarn scraper list

# Scrape complete data for an artist
yarn scraper scrape frankie-knuckles

# Add a playlist to collection
yarn scraper add-playlist larry-heard "https://youtube.com/playlist?list=ABC123"

# Add single video
yarn scraper add-video larry-heard "https://youtube.com/watch?v=XYZ456"

# Build frontend for specific artist
yarn build-for-artist frankie-knuckles

# Docker deployment
yarn docker-build larry-heard