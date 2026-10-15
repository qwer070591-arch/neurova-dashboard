<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, CircleHelp } from '@lucide/vue'
import { computed, ref, type Component } from 'vue'
import { useCountUp } from '../../composables/useCountUp'
import type { KpiMetric } from '../../types/analytics'
import { formatMetricValue } from '../../utils/analytics'

const props = defineProps<{
  metric: KpiMetric
  icon: Component
}>()

const tooltipOpen = ref(false)
const animatedValue = useCountUp(() => props.metric.value)
const tooltipId = computed(() => `metric-${props.metric.key}-tooltip`)
const displayValue = computed(() => formatMetricValue(props.metric.format, animatedValue.value))
const isPositiveTrend = computed(() => props.metric.trendPercent >= 0)
const trendLabel = computed(() => `${isPositiveTrend.value ? '+' : ''}${props.metric.trendPercent.toFixed(1)}%`)
const sparklinePoints = computed(() => {
  const values = props.metric.sparkline
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = maximum - minimum || 1
  const width = 116
  const height = 44
  const padding = 2

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - padding - ((value - minimum) / span) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
</script>

<template>
  <article class="kpi-card" :data-testid="`kpi-${metric.key}`">
    <div class="kpi-card__topline">
      <span class="kpi-card__icon" aria-hidden="true"><component :is="icon" :size="18" stroke-width="1.9" /></span>
      <div class="kpi-card__help">
        <button
          type="button"
          class="kpi-card__help-button"
          :aria-label="`${metric.label}說明`"
          :aria-expanded="tooltipOpen"
          :aria-describedby="tooltipOpen ? tooltipId : undefined"
          @click="tooltipOpen = !tooltipOpen"
          @blur="tooltipOpen = false"
        >
          <CircleHelp :size="16" aria-hidden="true" />
        </button>
        <span :id="tooltipId" class="kpi-card__tooltip" :class="{ 'kpi-card__tooltip--visible': tooltipOpen }" role="tooltip">
          {{ metric.tooltip }}
        </span>
      </div>
    </div>

    <p class="kpi-card__label">{{ metric.label }}</p>
    <p class="kpi-card__value">{{ displayValue }}</p>

    <div class="kpi-card__footer">
      <p class="kpi-card__comparison">
        <span class="kpi-card__trend" :class="isPositiveTrend ? 'kpi-card__trend--positive' : 'kpi-card__trend--negative'">
          <ArrowUpRight v-if="isPositiveTrend" :size="14" aria-hidden="true" />
          <ArrowDownRight v-else :size="14" aria-hidden="true" />
          {{ trendLabel }}
        </span>
        <span>{{ metric.comparisonLabel }}</span>
      </p>
      <svg class="kpi-card__sparkline" viewBox="0 0 116 44" role="img" :aria-label="`${metric.label}趨勢`" preserveAspectRatio="none">
        <defs>
          <linearGradient :id="`sparkline-${metric.key}`" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <polygon :points="`0,44 ${sparklinePoints} 116,44`" :fill="`url(#sparkline-${metric.key})`" />
        <polyline :points="sparklinePoints" fill="none" stroke="var(--color-primary-strong)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </div>
  </article>
</template>

<style scoped>
.kpi-card {
  position: relative;
  min-width: 0;
  padding: var(--space-5);
  overflow: visible;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: var(--shadow-surface);
  transition: border-color var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard);
}

.kpi-card:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

.kpi-card__topline,
.kpi-card__footer,
.kpi-card__help,
.kpi-card__comparison,
.kpi-card__trend {
  display: flex;
  align-items: center;
}

.kpi-card__topline,
.kpi-card__footer {
  justify-content: space-between;
  gap: var(--space-3);
}

.kpi-card__icon {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border));
  border-radius: var(--radius-md);
  color: var(--color-primary-strong);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated));
}

.kpi-card__help {
  position: relative;
}

.kpi-card__help-button {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-subtle);
  background: transparent;
}

.kpi-card__help-button:hover,
.kpi-card__help-button[aria-expanded='true'] {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.kpi-card__tooltip {
  position: absolute;
  z-index: 5;
  top: calc(100% + var(--space-2));
  right: 0;
  width: min(16rem, 72vw);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  background: var(--color-surface-elevated);
  box-shadow: var(--shadow-float);
  font-size: 0.75rem;
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-0.25rem);
  transition: opacity var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard);
}

.kpi-card__help:hover .kpi-card__tooltip,
.kpi-card__tooltip--visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.kpi-card__label,
.kpi-card__value,
.kpi-card__comparison {
  margin: 0;
}

.kpi-card__label {
  margin-top: var(--space-5);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.kpi-card__value {
  margin-top: var(--space-2);
  color: var(--color-text);
  font-size: clamp(1.625rem, 2.3vw, 2.25rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.kpi-card__footer {
  margin-top: var(--space-5);
}

.kpi-card__comparison {
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-1);
  color: var(--color-text-subtle);
  font-size: 0.6875rem;
  line-height: 1.35;
}

.kpi-card__trend {
  gap: 0.125rem;
  font-weight: 700;
}

.kpi-card__trend--positive {
  color: var(--color-success-text);
}

.kpi-card__trend--negative {
  color: var(--color-error-text);
}

.kpi-card__sparkline {
  width: 7.25rem;
  height: 2.75rem;
  flex: 0 0 auto;
}

@media (max-width: 34rem) {
  .kpi-card {
    padding: var(--space-4);
  }

  .kpi-card__label {
    margin-top: var(--space-4);
  }
}
</style>
