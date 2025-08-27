# Multi-stage build for Vue.js app with nginx
FROM node:23-alpine AS build

# Install bash for the prepare-assets script
RUN apk add --no-cache bash

WORKDIR /app

# Build argument for artist name (only one needed!)
ARG ARTIST_NAME=larry-heard

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy scraper and run it if needed
COPY scraper/ ./scraper/
RUN cd scraper && yarn install --frozen-lockfile

# Copy environment configs and asset templates
COPY env-configs/ ./env-configs/
COPY templates/ ./templates/
COPY public-assets/ ./public-assets/
COPY scripts/prepare-assets.sh ./scripts/

# Copy source code
COPY . .

# Load artist configuration and set environment variables
RUN if [ -f "env-configs/${ARTIST_NAME}.env" ]; then \
        echo "Loading config for ${ARTIST_NAME}..."; \
        cp "env-configs/${ARTIST_NAME}.env" .env; \
        # Source the env file and export variables for build time \
        set -a && . "env-configs/${ARTIST_NAME}.env" && set +a; \
        echo "Configured for: $VITE_ARTIST_DISPLAY_NAME"; \
    else \
        echo "Warning: No config found for ${ARTIST_NAME}, using defaults"; \
        echo "VITE_ARTIST_NAME=${ARTIST_NAME}" > .env; \
        echo "VITE_ARTIST_DISPLAY_NAME=${ARTIST_NAME}" >> .env; \
    fi

# Prepare assets for the artist
RUN chmod +x scripts/prepare-assets.sh && \
    bash scripts/prepare-assets.sh "${ARTIST_NAME}"

# Generate data for the artist if not exists
RUN cd scraper && \
    if [ ! -f "data/${ARTIST_NAME}-collection.csv" ]; then \
        echo "No data found, would need to run scraper in production"; \
        touch "data/${ARTIST_NAME}-collection.csv"; \
        echo "Title,URL,Video ID,Channel" > "data/${ARTIST_NAME}-collection.csv"; \
    fi && \
    npx tsx src/convert-to-vue.ts "${ARTIST_NAME}" && \
    cd ..

# Build the app
RUN yarn build

# Production stage with nginx
FROM nginx:alpine

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional - nginx default config works for SPAs)
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]