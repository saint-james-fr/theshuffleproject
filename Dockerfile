# Multi-stage build for Vue.js app with nginx
FROM node:23-alpine AS build

WORKDIR /app

# Build arguments for artist configuration
ARG ARTIST_NAME=larry-heard
ARG VITE_ARTIST_NAME
ARG VITE_ARTIST_DISPLAY_NAME
ARG VITE_SITE_URL
ARG VITE_ARTIST_DESCRIPTION
ARG VITE_ARTIST_KEYWORDS
ARG VITE_SOCIAL_IMAGE
ARG VITE_TWITTER_IMAGE
ARG VITE_THEME_COLOR

# Set environment variables for Vite
ENV VITE_ARTIST_NAME=${VITE_ARTIST_NAME}
ENV VITE_ARTIST_DISPLAY_NAME=${VITE_ARTIST_DISPLAY_NAME}
ENV VITE_SITE_URL=${VITE_SITE_URL}
ENV VITE_ARTIST_DESCRIPTION=${VITE_ARTIST_DESCRIPTION}
ENV VITE_ARTIST_KEYWORDS=${VITE_ARTIST_KEYWORDS}
ENV VITE_SOCIAL_IMAGE=${VITE_SOCIAL_IMAGE}
ENV VITE_TWITTER_IMAGE=${VITE_TWITTER_IMAGE}
ENV VITE_THEME_COLOR=${VITE_THEME_COLOR}

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

# Set up environment from artist config
RUN if [ -f "env-configs/${ARTIST_NAME}.env" ]; then \
        cp "env-configs/${ARTIST_NAME}.env" .env; \
        echo "Using config for ${ARTIST_NAME}"; \
    else \
        echo "Warning: No config found for ${ARTIST_NAME}, using defaults"; \
    fi

# Prepare assets for the artist
RUN chmod +x scripts/prepare-assets.sh && \
    ./scripts/prepare-assets.sh "${ARTIST_NAME}"

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