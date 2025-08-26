#!/bin/bash

# Prepare assets for a specific artist
# Usage: ./scripts/prepare-assets.sh <artist-name>

set -e

ARTIST_NAME=${1:-larry-heard}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🎨 Preparing assets for artist: $ARTIST_NAME"

# Check if artist config exists
ENV_CONFIG="$PROJECT_ROOT/env-configs/$ARTIST_NAME.env"
if [ ! -f "$ENV_CONFIG" ]; then
    echo "❌ Environment config not found: $ENV_CONFIG"
    echo "💡 Available configs:"
    ls -1 "$PROJECT_ROOT/env-configs/"*.env 2>/dev/null | xargs -n1 basename | sed 's/.env$//' | sed 's/^/   - /'
    exit 1
fi

echo "📝 Loading environment config: $ENV_CONFIG"

# Load environment variables from config
set -a
source "$ENV_CONFIG"
set +a

# Define paths
ARTIST_ASSETS_DIR="$PROJECT_ROOT/public-assets/$ARTIST_NAME"
DEFAULT_ASSETS_DIR="$PROJECT_ROOT/public-assets/default"
PUBLIC_DIR="$PROJECT_ROOT/public"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

# Create public directory if it doesn't exist
mkdir -p "$PUBLIC_DIR"

# Copy artist-specific assets or fall back to default
if [ -d "$ARTIST_ASSETS_DIR" ]; then
    echo "🎨 Using artist-specific assets from: $ARTIST_ASSETS_DIR"
    cp -r "$ARTIST_ASSETS_DIR"/* "$PUBLIC_DIR/"
else
    echo "⚠️  No artist-specific assets found, using defaults"
    if [ -d "$DEFAULT_ASSETS_DIR" ]; then
        cp -r "$DEFAULT_ASSETS_DIR"/* "$PUBLIC_DIR/"
    else
        echo "❌ No default assets found. Please ensure public-assets/default exists."
        exit 1
    fi
fi

# Generate dynamic files from templates
echo "📄 Generating dynamic files from templates..."

# Process index.html template
if [ -f "$TEMPLATES_DIR/index.html.template" ]; then
    echo "   📄 Generating index.html"
    sed -e "s/{{ARTIST_DISPLAY_NAME}}/$VITE_ARTIST_DISPLAY_NAME/g" \
        -e "s/{{ARTIST_DESCRIPTION}}/$VITE_ARTIST_DESCRIPTION/g" \
        -e "s/{{ARTIST_KEYWORDS}}/$VITE_ARTIST_KEYWORDS/g" \
        -e "s|{{SITE_URL}}|$VITE_SITE_URL|g" \
        -e "s|{{SOCIAL_IMAGE}}|$VITE_SOCIAL_IMAGE|g" \
        -e "s|{{TWITTER_IMAGE}}|$VITE_TWITTER_IMAGE|g" \
        -e "s/{{THEME_COLOR}}/$VITE_THEME_COLOR/g" \
        "$TEMPLATES_DIR/index.html.template" > "$PROJECT_ROOT/index.html"
fi

# Process site.webmanifest template
if [ -f "$TEMPLATES_DIR/site.webmanifest.template" ]; then
    echo "   📄 Generating site.webmanifest"
    sed -e "s/{{ARTIST_DISPLAY_NAME}}/$VITE_ARTIST_DISPLAY_NAME/g" \
        -e "s/{{ARTIST_DESCRIPTION}}/$VITE_ARTIST_DESCRIPTION/g" \
        -e "s/{{THEME_COLOR}}/$VITE_THEME_COLOR/g" \
        "$TEMPLATES_DIR/site.webmanifest.template" > "$PUBLIC_DIR/site.webmanifest"
fi

echo ""
echo "✅ Assets prepared successfully for $VITE_ARTIST_DISPLAY_NAME!"
echo "📁 Assets copied to: $PUBLIC_DIR"
echo "📄 Dynamic files generated: index.html, site.webmanifest"
echo ""
echo "💡 To customize assets for this artist:"
echo "   1. Create/edit: $ARTIST_ASSETS_DIR/"
echo "   2. Add your custom favicon, images, etc."
echo "   3. Run this script again to apply changes"
