#!/bin/bash

# Build script for different artists
# Usage: ./scripts/build-for-artist.sh <artist-name>

set -e

ARTIST_NAME=${1:-larry-heard}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🎵 Building for artist: $ARTIST_NAME"
echo "📁 Project root: $PROJECT_ROOT"

# Check if artist config exists
ENV_CONFIG="$PROJECT_ROOT/env-configs/$ARTIST_NAME.env"
if [ ! -f "$ENV_CONFIG" ]; then
    echo "❌ Environment config not found: $ENV_CONFIG"
    echo "💡 Available configs:"
    ls -1 "$PROJECT_ROOT/env-configs/"*.env 2>/dev/null | xargs -n1 basename | sed 's/.env$//' | sed 's/^/   - /'
    exit 1
fi

echo "📝 Using environment config: $ENV_CONFIG"

# Copy environment config to .env
cp "$ENV_CONFIG" "$PROJECT_ROOT/.env"
echo "✅ Environment configured for $ARTIST_NAME"

# Prepare assets for the artist
echo "🎨 Preparing assets for $ARTIST_NAME..."
"$PROJECT_ROOT/scripts/prepare-assets.sh" "$ARTIST_NAME"

# Run scraper if data doesn't exist
SCRAPER_DATA_FILE="$PROJECT_ROOT/scraper/data/$ARTIST_NAME-collection.csv"
if [ ! -f "$SCRAPER_DATA_FILE" ]; then
    echo "📊 No data found for $ARTIST_NAME, running scraper..."
    cd "$PROJECT_ROOT/scraper"
    yarn scraper scrape "$ARTIST_NAME"
    cd "$PROJECT_ROOT"
else
    echo "📊 Using existing data: $SCRAPER_DATA_FILE"
fi

# Convert CSV to Vue data
echo "🔄 Converting data to Vue format..."
cd "$PROJECT_ROOT/scraper"
npx tsx src/convert-to-vue.ts "$ARTIST_NAME"
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Build the frontend
echo "🏗️  Building frontend..."
yarn build

echo ""
echo "🎉 Build completed successfully for $ARTIST_NAME!"
echo "📁 Build output: $PROJECT_ROOT/dist/"
echo ""
echo "🚀 To serve locally: yarn preview"
echo "🐳 To build Docker image: docker build -t shuffle-$ARTIST_NAME ."
