<template>
  <div class="video-controls">
    <div class="main-controls">
      <button
        @click="onPrevious"
        class="control-button"
        title="Previous track"
      >
        ‹ PREV
      </button>
      
      <div class="video-counter">
        {{ String(currentIndex + 1).padStart(3, '0') }} / {{ String(totalVideos).padStart(3, '0') }}
      </div>
      
      <button
        @click="onNext"
        class="control-button"
        title="Next track"
      >
        NEXT ›
      </button>
    </div>
    
    <button
      @click="onShuffle"
      class="shuffle-button"
      title="Reshuffle playlist"
    >
      SHUFFLE
    </button>
  </div>
</template>

<script setup lang="ts">
type Props = {
  currentIndex: number
  totalVideos: number
  hasNext: boolean
  hasPrevious: boolean
}

type Emits = {
  next: []
  previous: []
  shuffle: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const onNext = () => emit('next')
const onPrevious = () => emit('previous')
const onShuffle = () => emit('shuffle')
</script>

<style scoped>
.video-controls {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #000;
  border-top: 1px solid #333;
  font-family: inherit;
}

.main-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.control-button {
  background: transparent;
  color: white;
  border: 1px solid #333;
  padding: 12px 20px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
  min-width: 80px;
}

.control-button:hover {
  background: white;
  color: black;
  border-color: white;
}

.control-button:active {
  transform: scale(0.98);
}

.video-counter {
  font-size: 0.875rem;
  color: #999;
  font-weight: 400;
  letter-spacing: 2px;
  text-align: center;
  min-width: 120px;
}

.shuffle-button {
  align-self: center;
  background: transparent;
  color: #666;
  border: 1px solid #333;
  padding: 8px 16px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.shuffle-button:hover {
  color: white;
  border-color: #666;
}

@media (max-width: 768px) {
  .video-controls {
    padding: 16px;
    gap: 12px;
  }
  
  .main-controls {
    gap: 16px;
  }
  
  .control-button {
    padding: 10px 16px;
    font-size: 0.7rem;
    min-width: 60px;
  }
  
  .video-counter {
    font-size: 0.8rem;
    min-width: 100px;
  }
  
  .shuffle-button {
    font-size: 0.65rem;
    padding: 6px 12px;
  }
}
</style>
