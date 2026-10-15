<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useChartMotion } from '../../composables/useChartMotion'
import { echarts, type EChartsCoreOption } from '../../services/echarts'
import type { AppTheme } from '../../stores/ui'
import type { ModelDistributionItem } from '../../types/analytics'
import { formatMetricValue } from '../../utils/analytics'

const props = defineProps<{
  data: readonly ModelDistributionItem[]
  theme: AppTheme
}>()

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
const animationEnabled = useChartMotion()
const isLoading = ref(true)
const isReady = ref(false)
let resizeObserver: ResizeObserver | undefined
let loadingTimer: number | undefined

const hasData = computed(() => props.data.some((item) => item.totalTokens > 0))
const accessibleSummary = computed(() => {
  if (!hasData.value) return '所選日期範圍暫無模型使用分布資料。'
  return props.data.map((item) => `${item.model.name} ${item.percentage.toFixed(1)}%`).join('、')
})

function cssColor(name: string) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function buildOption(): EChartsCoreOption {
  const text = cssColor('--color-text-muted')
  const border = cssColor('--color-border')
  const surface = cssColor('--color-surface-elevated')
  const compact = (chartElement.value?.clientWidth ?? 0) < 360

  return {
    animation: animationEnabled.value,
    animationDuration: 360,
    animationEasing: 'cubicOut',
    color: props.data.map((item) => cssColor(item.model.colorToken)),
    tooltip: {
      trigger: 'item',
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text },
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: number; percent?: number } | undefined
        if (!item) return ''
        return `${item.name ?? '模型'}<br/>${formatMetricValue('tokens', Number(item.value ?? 0))} Token · ${Number(item.percent ?? 0).toFixed(1)}%`
      },
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: compact ? 8 : 14,
      textStyle: { color: text, fontSize: compact ? 10 : 11 },
      width: '94%',
      type: 'plain',
    },
    series: [
      {
        name: 'Token 使用量',
        type: 'pie',
        radius: ['56%', '76%'],
        center: ['50%', compact ? '42%' : '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: cssColor('--color-surface'), borderWidth: 3, borderRadius: 4 },
        label: { show: false },
        labelLine: { show: false },
        data: props.data.map((item) => ({ name: item.model.name, value: item.totalTokens })),
      },
    ],
  }
}

function renderChart() {
  if (!chart.value || !hasData.value) return
  chart.value.setOption(buildOption(), { notMerge: true, lazyUpdate: true })
  isReady.value = true
}

function initializeChart() {
  if (!chartElement.value || chart.value) return
  chart.value = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
  chart.value.showLoading('default', { text: '載入模型分布中', color: cssColor('--color-primary'), textColor: cssColor('--color-text-muted'), maskColor: 'transparent' })
  renderChart()
  loadingTimer = window.setTimeout(() => {
    isLoading.value = false
    chart.value?.hideLoading()
  }, 220)
  resizeObserver = new ResizeObserver(() => {
    chart.value?.resize()
    renderChart()
  })
  resizeObserver.observe(chartElement.value)
}

watch(
  () => [props.data, props.theme, animationEnabled.value],
  async () => {
    await nextTick()
    renderChart()
  },
)

onMounted(initializeChart)

onBeforeUnmount(() => {
  if (loadingTimer) window.clearTimeout(loadingTimer)
  resizeObserver?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div class="model-distribution">
    <p class="sr-only">{{ accessibleSummary }}</p>
    <div v-if="!hasData" class="chart-state" data-testid="model-distribution-empty">
      <strong>暫無模型使用資料</strong>
      <span>請嘗試選擇其他日期範圍。</span>
    </div>
    <div
      v-show="hasData"
      ref="chartElement"
      class="model-distribution__canvas"
      data-testid="model-distribution-chart"
      :data-chart-rendered="isReady ? 'true' : 'false'"
      role="img"
      :aria-label="accessibleSummary"
    />
    <div v-if="isLoading && hasData" class="model-distribution__loading" role="status">模型分布載入中</div>
  </div>
</template>

<style scoped>
.model-distribution {
  position: relative;
  min-width: 0;
  min-height: 18rem;
}

.model-distribution__canvas {
  width: 100%;
  min-height: 18rem;
}

.model-distribution__loading,
.chart-state {
  display: grid;
  place-items: center;
}

.model-distribution__loading {
  position: absolute;
  inset: 0;
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-surface) 68%, transparent);
  font-size: 0.8125rem;
  pointer-events: none;
}

.chart-state {
  min-height: 18rem;
  align-content: center;
  gap: var(--space-2);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-align: center;
}

.chart-state strong {
  color: var(--color-text);
}

.chart-state span {
  font-size: 0.8125rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
