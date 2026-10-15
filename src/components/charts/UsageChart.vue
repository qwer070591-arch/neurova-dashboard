<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useChartMotion } from '../../composables/useChartMotion'
import { echarts, type EChartsCoreOption } from '../../services/echarts'
import type { AppTheme } from '../../stores/ui'
import type { UsagePoint } from '../../types/analytics'
import { formatInteger } from '../../utils/analytics'

const props = defineProps<{
  data: readonly UsagePoint[]
  theme: AppTheme
}>()

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
const animationEnabled = useChartMotion()
const isLoading = ref(true)
const isReady = ref(false)
let resizeObserver: ResizeObserver | undefined
let loadingTimer: number | undefined

const hasData = computed(() => props.data.length > 0)
const accessibleSummary = computed(() => {
  if (!hasData.value) return '所選日期範圍暫無使用量分析資料。'
  const totalTokens = props.data.reduce((total, point) => total + point.totalTokens, 0)
  const totalRequests = props.data.reduce((total, point) => total + point.requests, 0)
  return `從 ${props.data[0].label} 至 ${props.data[props.data.length - 1].label}，共使用 ${formatInteger(totalTokens)} 個 Token，包含 ${formatInteger(totalRequests)} 筆請求。`
})

function cssColor(name: string) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function withAlpha(color: string, alpha: number) {
  const hex = color.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(hex)) return color
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function compactAxisValue(value: number) {
  return new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function buildOption(): EChartsCoreOption {
  const text = cssColor('--color-text-muted')
  const border = cssColor('--color-border')
  const primary = cssColor('--color-primary')
  const secondary = cssColor('--color-secondary')
  const surface = cssColor('--color-surface-elevated')
  const labels = props.data.map((point) => point.label)
  const axisInterval = labels.length > 90 ? Math.ceil(labels.length / 7) - 1 : labels.length > 30 ? Math.ceil(labels.length / 6) - 1 : 'auto'

  return {
    animation: animationEnabled.value,
    animationDuration: 360,
    animationEasing: 'cubicOut',
    color: [primary, secondary],
    grid: { top: 46, right: 12, bottom: 8, left: 12, containLabel: true },
    legend: {
      top: 2,
      left: 0,
      itemWidth: 16,
      itemHeight: 3,
      textStyle: { color: text, fontSize: 12 },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text },
      valueFormatter: (value: string | number) => formatInteger(Number(value)),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false },
      axisLabel: { color: text, fontSize: 11, interval: axisInterval, hideOverlap: true, margin: 14 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Token',
        nameTextStyle: { color: text, fontSize: 11, padding: [0, 0, 0, 4] },
        axisLabel: { color: text, fontSize: 11, formatter: compactAxisValue },
        splitLine: { lineStyle: { color: withAlpha(border, 0.64), type: 'dashed' } },
      },
      {
        type: 'value',
        name: '請求數',
        nameTextStyle: { color: text, fontSize: 11, padding: [0, 4, 0, 0] },
        axisLabel: { color: text, fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Token 使用量',
        type: 'line',
        data: props.data.map((point) => point.totalTokens),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { width: 2.5 },
        itemStyle: { color: primary },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: withAlpha(primary, 0.3) },
            { offset: 1, color: withAlpha(primary, 0.015) },
          ]),
        },
      },
      {
        name: '請求數',
        type: 'line',
        yAxisIndex: 1,
        data: props.data.map((point) => point.requests),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: secondary },
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
  chart.value.showLoading('default', { text: '載入使用量分析中', color: cssColor('--color-primary'), textColor: cssColor('--color-text-muted'), maskColor: 'transparent' })
  renderChart()
  loadingTimer = window.setTimeout(() => {
    isLoading.value = false
    chart.value?.hideLoading()
  }, 220)
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
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
  <div class="usage-chart">
    <p class="sr-only">{{ accessibleSummary }}</p>
    <div v-if="!hasData" class="chart-state" data-testid="usage-chart-empty">
      <strong>暫無使用量資料</strong>
      <span>請嘗試選擇其他日期範圍。</span>
    </div>
    <div
      v-show="hasData"
      ref="chartElement"
      class="usage-chart__canvas"
      data-testid="usage-chart"
      :data-chart-rendered="isReady ? 'true' : 'false'"
      role="img"
      :aria-label="accessibleSummary"
    />
    <div v-if="isLoading && hasData" class="usage-chart__loading" role="status">使用量分析載入中</div>
  </div>
</template>

<style scoped>
.usage-chart {
  position: relative;
  min-width: 0;
  min-height: 19rem;
}

.usage-chart__canvas {
  width: 100%;
  min-height: 19rem;
}

.usage-chart__loading,
.chart-state {
  display: grid;
  place-items: center;
}

.usage-chart__loading {
  position: absolute;
  inset: 0;
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-surface) 68%, transparent);
  font-size: 0.8125rem;
  pointer-events: none;
}

.chart-state {
  min-height: 19rem;
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

@media (max-width: 40rem) {
  .usage-chart,
  .usage-chart__canvas,
  .chart-state {
    min-height: 17rem;
  }
}
</style>
