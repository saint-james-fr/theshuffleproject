#!/bin/bash

# Docker build script for different artists
# Usage: ./scripts/docker-build.sh <artist-name> [tag]

set -e

ARTIST_NAME=${1:-larry-heard}
TAG=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🐳 Building Docker image for artist: $ARTIST_NAME"
echo "🏷️  Tag: $TAG"

# Check if artist config exists
ENV_CONFIG="$PROJECT_ROOT/env-configs/$ARTIST_NAME.env"
if [ ! -f "$ENV_CONFIG" ]; then
    echo "❌ Environment config not found: $ENV_CONFIG"
    echo "💡 Available configs:"
    ls -1 "$PROJECT_ROOT/env-configs/"*.env 2>/dev/null | xargs -n1 basename | sed 's/.env$//' | sed 's/^/   - /'
    exit 1
fi

echo "📝 Using environment config: $ENV_CONFIG"

# Load environment variables from config
set -a
source "$ENV_CONFIG"
set +a

# Build Docker image with build args
echo "🏗️  Building Docker image..."
docker build \
    --build-arg ARTIST_NAME="$ARTIST_NAME" \
    --build-arg VITE_ARTIST_NAME="$VITE_ARTIST_NAME" \
    --build-arg VITE_ARTIST_DISPLAY_NAME="$VITE_ARTIST_DISPLAY_NAME" \
    --build-arg VITE_SITE_URL="$VITE_SITE_URL" \
    --build-arg VITE_ARTIST_DESCRIPTION="$VITE_ARTIST_DESCRIPTION" \
    --build-arg VITE_ARTIST_KEYWORDS="$VITE_ARTIST_KEYWORDS" \
    --build-arg VITE_SOCIAL_IMAGE="$VITE_SOCIAL_IMAGE" \
    --build-arg VITE_TWITTER_IMAGE="$VITE_TWITTER_IMAGE" \
    --build-arg VITE_THEME_COLOR="$VITE_THEME_COLOR" \
    -t "shuffle-$ARTIST_NAME:$TAG" \
    "$PROJECT_ROOT"

echo ""
echo "🎉 Docker image built successfully!"
echo "🏷️  Image: shuffle-$ARTIST_NAME:$TAG"
echo ""
echo "🚀 To run: docker run -p 80:80 shuffle-$ARTIST_NAME:$TAG"
echo "🌐 Then open: http://localhost"
