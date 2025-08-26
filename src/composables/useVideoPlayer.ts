import { ref, computed, onMounted } from 'vue'
import { videos, type VideoData } from '@/data/videos'

// Shuffle array function
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useVideoPlayer = () => {
  const currentIndex = ref(0)
  const shuffledVideos = ref<VideoData[]>([])
  
  const currentVideo = computed(() => shuffledVideos.value[currentIndex.value])
  
  const hasNext = computed(() => currentIndex.value < shuffledVideos.value.length - 1)
  const hasPrevious = computed(() => currentIndex.value > 0)
  
  const nextVideo = () => {
    if (hasNext.value) {
      currentIndex.value++
    } else {
      // Loop back to beginning when reaching the end
      currentIndex.value = 0
    }
  }
  
  const previousVideo = () => {
    if (hasPrevious.value) {
      currentIndex.value--
    } else {
      // Loop to end when at beginning
      currentIndex.value = shuffledVideos.value.length - 1
    }
  }
  
  const goToVideo = (index: number) => {
    if (index >= 0 && index < shuffledVideos.value.length) {
      currentIndex.value = index
    }
  }
  
  const reshuffleAndStart = () => {
    shuffledVideos.value = shuffleArray(videos)
    currentIndex.value = 0
  }
  
  // Initialize with shuffled list on mount
  onMounted(() => {
    reshuffleAndStart()
  })
  
  return {
    currentVideo,
    currentIndex: computed(() => currentIndex.value),
    totalVideos: computed(() => shuffledVideos.value.length),
    hasNext: computed(() => true), // Always true since we loop
    hasPrevious: computed(() => true), // Always true since we loop
    nextVideo,
    previousVideo,
    goToVideo,
    shuffleToRandomStart: reshuffleAndStart
  }
}
