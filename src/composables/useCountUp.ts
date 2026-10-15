import { onBeforeUnmount, ref, watch } from 'vue'

export function useCountUp(target: () => number, duration = 620) {
  const value = ref(0)
  let animationFrame = 0

  const animate = (nextValue: number) => {
    window.cancelAnimationFrame(animationFrame)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      value.value = nextValue
      return
    }

    const startValue = value.value
    const startedAt = window.performance.now()
    const change = nextValue - startValue

    const frame = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const easedProgress = 1 - (1 - progress) ** 3
      value.value = startValue + change * easedProgress
      if (progress < 1) animationFrame = window.requestAnimationFrame(frame)
    }

    animationFrame = window.requestAnimationFrame(frame)
  }

  watch(target, animate, { immediate: true })
  onBeforeUnmount(() => window.cancelAnimationFrame(animationFrame))

  return value
}
