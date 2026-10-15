<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useChartMotion } from '../../composables/useChartMotion'
import { echarts, type EChartsCoreOption } from '../../services/echarts'
import type { AppTheme } from '../../stores/ui'
import type { UsageBillingTrendPoint } from '../../types/analytics'
import { formatInteger } from '../../utils/analytics'

const props = defineProps<{ data: readonly UsageBillingTrendPoint[]; theme: AppTheme }>()

type UsageMetric = 'tokens' | 'requests'

const selectedMetric = ref<UsageMetric>('tokens')
const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
const animationEnabled = useChartMotion()
const isLoading = ref(true)
const isReady = ref(false)
const errorMessage = ref('')
let resizeObserver: ResizeObserver | undefined
let loadingTimer: number | undefined

const hasData = computed(() => props.data.length > 0)
const metricLabel = computed(() => selectedMetric.value === 'tokens' ? 'Token 使用量' : '請求數')
const summary = computed(() => hasData.value
  ? `${metricLabel.value}趨勢圖，共 ${props.data.length} 個期間。`
  : '此期間暫無使用量資料。')

function cssColor(name: string) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function compactAxisValue(value: number) {
  return new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function buildOption(): EChartsCoreOption {
  const color = selectedMetric.value === 'tokens' ? cssColor('--color-primary') : cssColor('--color-secondary')
  const border = cssColor('--color-border')
  const text = cssColor('--color-text-muted')
  const surface = cssColor('--color-surface-elevated')
  const compactViewport = window.matchMedia('(max-width: 40rem)').matches
  const labels = props.data.map((point) => point.label)
  const values = props.data.map((point) => selectedMetric.value === 'tokens' ? point.totalTokens : point.requestCount)
  const interval = labels.length > 90 ? Math.ceil(labels.length / 7) - 1 : labels.length > 30 ? Math.ceil(labels.length / 6) - 1 : 'auto'

  return {
    animation: animationEnabled.value,
    animationDuration: 300,
    animationEasing: 'cubicOut',
    grid: { top: 30, right: 16, bottom: 12, left: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text },
      valueFormatter: (value: string | number) => `${formatInteger(Number(value))}${selectedMetric.value === 'tokens' ? ' Token' : ' 次'}`,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false },
      axisLabel: { color: text, fontSize: compactViewport ? 10 : 11, interval, hideOverlap: true, margin: 14 },
    },
    yAxis: {
      type: 'value',
      name: selectedMetric.value === 'tokens' ? 'Token' : '請求數',
      nameTextStyle: { color: text, fontSize: 11, padding: [0, 0, 0, 4] },
      axisLabel: { color: text, fontSize: 11, formatter: compactAxisValue },
      splitLine: { lineStyle: { color: border, type: 'dashed', opacity: 0.64 } },
    },
    series: [{
      name: metricLabel.value,
      type: 'line' as const,
      data: values,
      smooth: 0.3,
      showSymbol: false,
      lineStyle: { width: 2.4, color },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}66` }, { offset: 1, color: `${color}05` }]) },
      emphasis: { focus: 'series' },
    }],
  }
}

function renderChart() {
  if (!chart.value || !hasData.value) return
  try {
    errorMessage.value = ''
    chart.value.setOption(buildOption(), { notMerge: true, lazyUpdate: true })
    isReady.value = true
  } catch {
    errorMessage.value = '無法顯示使用量趨勢，請稍後再試。'
  }
}

function initializeChart() {
  if (!chartElement.value || chart.value) return
  try {
    chart.value = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
    chart.value.showLoading('default', { text: '載入使用量趨勢…', color: cssColor('--color-primary'), textColor: cssColor('--color-text-muted'), maskColor: 'transparent' })
    renderChart()
    loadingTimer = window.setTimeout(() => { isLoading.value = false; chart.value?.hideLoading() }, 220)
    resizeObserver = new ResizeObserver(() => chart.value?.resize())
    resizeObserver.observe(chartElement.value)
  } catch {
    isLoading.value = false
    errorMessage.value = '無法顯示使用量趨勢，請稍後再試。'
  }
}

watch(() => [props.data, props.theme, selectedMetric.value, animationEnabled.value], async () => { await nextTick(); renderChart() })
onMounted(initializeChart)
onBeforeUnmount(() => { if (loadingTimer) window.clearTimeout(loadingTimer); resizeObserver?.disconnect(); chart.value?.dispose() })
</script>

<template>
  <div class="usage-volume-chart">
    <div class="usage-volume-chart__controls" role="group" aria-label="使用量趨勢指標">
      <button type="button" data-testid="billing-metric-tokens" :aria-pressed="selectedMetric === 'tokens'" :class="{ 'usage-volume-chart__control--active': selectedMetric === 'tokens' }" @click="selectedMetric = 'tokens'">Token</button>
      <button type="button" data-testid="billing-metric-requests" :aria-pressed="selectedMetric === 'requests'" :class="{ 'usage-volume-chart__control--active': selectedMetric === 'requests' }" @click="selectedMetric = 'requests'">請求數</button>
    </div>
    <p class="sr-only">{{ summary }}</p>
    <div v-if="errorMessage" class="usage-volume-chart__state" role="alert"><strong>圖表暫時無法使用</strong><span>{{ errorMessage }}</span></div>
    <div v-else-if="!hasData" class="usage-volume-chart__state"><strong>暫無資料</strong><span>請調整日期範圍後再查看使用量趨勢。</span></div>
    <div v-else ref="chartElement" class="usage-volume-chart__canvas" data-testid="usage-billing-chart" :data-chart-rendered="isReady ? 'true' : 'false'" role="img" :aria-label="summary" />
    <div v-if="isLoading && hasData && !errorMessage" class="usage-volume-chart__loading" role="status">載入圖表中</div>
  </div>
</template>

<style scoped>
.usage-volume-chart { position: relative; min-width: 0; }.usage-volume-chart__controls { display: inline-flex; padding: 0.1875rem; border: 1px solid var(--color-border); border-radius: 0.625rem; background: var(--color-surface-elevated); }.usage-volume-chart__controls button { min-height: 2.25rem; padding: 0 var(--space-3); border-radius: 0.4375rem; color: var(--color-text-muted); background: transparent; font-size: 0.75rem; font-weight: 700; }.usage-volume-chart__controls button:hover, .usage-volume-chart__control--active { color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)); }.usage-volume-chart__canvas, .usage-volume-chart__state { min-height: 20rem; margin-top: var(--space-4); }.usage-volume-chart__state { display: grid; place-content: center; gap: var(--space-2); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text-muted); text-align: center; }.usage-volume-chart__state strong { color: var(--color-text); }.usage-volume-chart__state span, .usage-volume-chart__loading { font-size: 0.8125rem; }.usage-volume-chart__loading { position: absolute; right: 0; bottom: 0; left: 0; display: grid; min-height: 20rem; place-items: center; color: var(--color-text-muted); background: color-mix(in srgb, var(--color-surface) 68%, transparent); pointer-events: none; }.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }@media (max-width: 40rem) { .usage-volume-chart__canvas, .usage-volume-chart__state, .usage-volume-chart__loading { min-height: 17rem; } }
</style>
