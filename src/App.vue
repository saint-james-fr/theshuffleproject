<script setup lang="ts">
import YouTubePlayer from "./components/YouTubePlayer.vue";
import VideoControls from "./components/VideoControls.vue";
import { useVideoPlayer } from "./composables/useVideoPlayer";
import { artistConfig } from "./config/artist";

const {
  currentVideo,
  currentIndex,
  totalVideos,
  hasNext,
  hasPrevious,
  nextVideo,
  previousVideo,
  shuffleToRandomStart,
} = useVideoPlayer();
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">The Shuffle Project: {{ artistConfig.displayName }}</h1>
      <p class="app-subtitle">{{ totalVideos }} tracks • scraped from Youtube & Discogs</p>
    </header>

    <main class="app-main">
      <YouTubePlayer v-if="currentVideo" :video-id="currentVideo.videoId" :title="currentVideo.title" />

      <VideoControls
        :current-index="currentIndex"
        :total-videos="totalVideos"
        :has-next="hasNext"
        :has-previous="hasPrevious"
        @next="nextVideo"
        @previous="previousVideo"
        @shuffle="shuffleToRandomStart"
      />
    </main>
  </div>
</template>

<style scoped>
.app {
  height: 100svh;
  width: 100vw;
  background: #000;
  color: white;
  font-family: "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", "Consolas", "Courier New", monospace;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  text-align: center;
  padding: 20px;
  border-bottom: 1px solid #333;
}

.app-title {
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: 0.875rem;
  color: #999;
  margin: 0;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex item to shrink */
}

@media (max-width: 768px) {
  .app-title {
    font-size: 1.5rem;
  }

  .app-subtitle {
    font-size: 0.75rem;
  }

  .app-header {
    padding: 16px;
  }
}
</style>
