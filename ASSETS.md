# Artist Assets Management

This document explains how to manage assets (favicons, images, etc.) for different artists in The Shuffle Project.

## How It Works

The system uses artist-specific asset directories and templates to generate customized branding for each artist:

```
public-assets/
├── larry-heard/          # Larry Heard specific assets
├── frankie-knuckles/     # Frankie Knuckles specific assets  
├── default/              # Default assets for new artists
└── <artist-name>/        # Custom assets for any artist

templates/
├── index.html.template      # HTML template with placeholders
└── site.webmanifest.template # Web manifest template
```

## Asset Types

Each artist directory should contain:

### Required Assets
- `favicon.ico` - Main favicon (16x16, 32x32, 48x48)
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon
- `apple-touch-icon.png` - 180x180 Apple touch icon
- `android-chrome-192x192.png` - 192x192 Android icon
- `android-chrome-512x512.png` - 512x512 Android icon

### Social Media Assets
- `og-image.jpg` - Open Graph image (1200x630 recommended)
- `twitter-image.jpg` - Twitter card image (1200x600 recommended)

### Generated Files
These are auto-generated from templates:
- `site.webmanifest` - Web app manifest
- `index.html` - HTML with dynamic meta tags

## Adding Assets for a New Artist

### Method 1: Copy from Existing Artist
```bash
# Copy Larry Heard's assets as starting point
cp -r public-assets/larry-heard public-assets/new-artist

# Customize the assets as needed
# Then prepare assets for the new artist
yarn prepare-assets new-artist
```

### Method 2: Use Default Template
```bash
# Assets will be copied from default template automatically
yarn prepare-assets new-artist
```

### Method 3: Manual Creation
```bash
# Create artist directory
mkdir -p public-assets/new-artist

# Add your custom assets
cp my-favicon.ico public-assets/new-artist/favicon.ico
cp my-icon-192.png public-assets/new-artist/android-chrome-192x192.png
# ... add all required assets

# Prepare assets
yarn prepare-assets new-artist
```

## Customizing Assets

### 1. Favicon Generation
You can use online tools to generate favicons from a source image:
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

Generate these sizes:
- 16x16, 32x32 (favicon.ico)
- 16x16 PNG (favicon-16x16.png)
- 32x32 PNG (favicon-32x32.png)
- 180x180 PNG (apple-touch-icon.png)
- 192x192 PNG (android-chrome-192x192.png)
- 512x512 PNG (android-chrome-512x512.png)

### 2. Social Media Images
- **Open Graph Image**: 1200x630px, shows on Facebook/LinkedIn shares
- **Twitter Image**: 1200x600px, shows on Twitter cards

Include artist name, branding, and recognizable imagery.

### 3. Theme Colors
Update the artist's environment config (`env-configs/artist-name.env`):
```bash
VITE_THEME_COLOR="#your-color"
```

## Building with Custom Assets

### Development
```bash
# Prepare assets for development
yarn prepare-assets larry-heard

# Start development server
yarn dev
```

### Production Build
```bash
# Build for specific artist (includes asset preparation)
yarn build-for-artist frankie-knuckles
```

### Docker Build
```bash
# Docker build (includes asset preparation)
yarn docker-build larry-heard
```

## Asset Guidelines

### File Naming Convention
Use exact filenames as shown above. The system expects specific names.

### File Formats
- **Icons**: PNG or ICO
- **Social Images**: JPG (for better compression) or PNG
- **Size Limits**: Keep files under 1MB each for web performance

### Design Guidelines
- **Consistency**: Match the artist's brand colors and style
- **Contrast**: Ensure favicons work on both light and dark backgrounds
- **Simplicity**: Icons should be recognizable at small sizes (16x16)

## Testing Your Assets

After preparing assets, test them:

1. **Local Development**: `yarn dev` and check browser tab, favorites
2. **Social Media**: Use [Facebook Debugger](https://developers.facebook.com/tools/debug/) and [Twitter Card Validator](https://cards-dev.twitter.com/validator)
3. **Mobile**: Test on actual mobile devices for touch icons

## Asset Directory Structure

```
public-assets/
├── larry-heard/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── og-image.jpg
│   └── twitter-image.jpg
├── frankie-knuckles/
│   └── (same structure)
└── default/
    └── (fallback assets)
```

## Troubleshooting

### Assets Not Loading
1. Check file names exactly match expected names
2. Run `yarn prepare-assets <artist>` to copy assets to public/
3. Clear browser cache and hard refresh

### Wrong Branding Showing
1. Verify environment config has correct values
2. Re-run `yarn prepare-assets <artist>`
3. Check that templates are being processed correctly

### Missing Assets
1. Copy from `public-assets/default/` as starting point
2. Ensure all required files are present
3. Check file permissions are readable

## Commands Reference

```bash
# Prepare assets for artist
yarn prepare-assets <artist-name>

# Build with assets
yarn build-for-artist <artist-name>

# Docker build with assets  
yarn docker-build <artist-name>

# List available artists
yarn scraper list
```
