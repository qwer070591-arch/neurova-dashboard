import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

const motionQuery = '(prefers-reduced-motion: reduce)'

export function shouldAnimateCharts(userReducedMotion: boolean, systemReducedMotion: boolean): boolean {
  return !userReducedMotion && !systemReducedMotion
}

export function useChartMotion() {
  const settings = useSettingsStore()
  const mediaQuery = typeof window === 'undefined' ? null : window.matchMedia(motionQuery)
  const systemReducedMotion = ref(mediaQuery?.matches ?? false)
  const animationEnabled = computed(() => shouldAnimateCharts(settings.reducedMotion, systemReducedMotion.value))

  function handleSystemMotionChange(event: MediaQueryListEvent) {
    systemReducedMotion.value = event.matches
  }

  onMounted(() => mediaQuery?.addEventListener('change', handleSystemMotionChange))
  onBeforeUnmount(() => mediaQuery?.removeEventListener('change', handleSystemMotionChange))

  return animationEnabled
}
