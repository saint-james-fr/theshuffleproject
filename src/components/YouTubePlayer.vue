<template>
  <div class="youtube-player">
    <div class="video-container">
      <iframe
        :src="`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        class="video-iframe"
      />
    </div>
    <div class="video-info">
      <h3 class="video-title">{{ title }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  videoId: string;
  title: string;
};

defineProps<Props>();
</script>

<style scoped>
.youtube-player {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.video-container {
  flex: 1;
  position: relative;
  width: 100%;
  min-height: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
  max-height: calc(100svh - 200px);
}

.video-info {
  flex-shrink: 0;
  padding: 20px;
  border-bottom: 1px solid #333;
  background: #000;
}

.video-title {
  font-size: 0.875rem;
  font-weight: 400;
  color: white;
  margin: 0;
  line-height: 1.4;
  font-family: inherit;
  word-wrap: break-word;
  text-align: left;
}

@media (max-width: 768px) {
  .video-title {
    font-size: 0.8rem;
  }

  .video-info {
    padding: 16px;
  }
}
</style>
