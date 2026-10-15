<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useChartMotion } from '../../composables/useChartMotion'
import { echarts, type EChartsCoreOption } from '../../services/echarts'
import type { AppTheme } from '../../stores/ui'
import type { UsageBillingTrendPoint } from '../../types/analytics'
import { formatMetricValue } from '../../utils/analytics'

const props = defineProps<{ data: readonly UsageBillingTrendPoint[]; theme: AppTheme }>()
const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
const animationEnabled = useChartMotion()
const isLoading = ref(true)
const isReady = ref(false)
const errorMessage = ref('')
let resizeObserver: ResizeObserver | undefined
let loadingTimer: number | undefined
const hasData = computed(() => props.data.length > 0)
const summary = computed(() => hasData.value ? `預估費用趨勢圖，共 ${props.data.length} 個期間。` : '此期間暫無費用資料。')

function cssColor(name: string) { return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() }
function axisCurrency(value: number) { return `US$${new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}` }
function buildOption(): EChartsCoreOption {
  const primary = cssColor('--color-secondary'); const border = cssColor('--color-border'); const text = cssColor('--color-text-muted'); const surface = cssColor('--color-surface-elevated')
  const labels = props.data.map((point) => point.label); const interval = labels.length > 90 ? Math.ceil(labels.length / 7) - 1 : labels.length > 30 ? Math.ceil(labels.length / 6) - 1 : 'auto'
  return { animation: animationEnabled.value, animationDuration: 300, animationEasing: 'cubicOut', grid: { top: 30, right: 16, bottom: 12, left: 12, containLabel: true }, tooltip: { trigger: 'axis', confine: true, backgroundColor: surface, borderColor: border, borderWidth: 1, textStyle: { color: text }, valueFormatter: (value: string | number) => formatMetricValue('currency', Number(value)) }, xAxis: { type: 'category', boundaryGap: false, data: labels, axisLine: { lineStyle: { color: border } }, axisTick: { show: false }, axisLabel: { color: text, fontSize: 11, interval, hideOverlap: true, margin: 14 } }, yAxis: { type: 'value', name: 'USD', nameTextStyle: { color: text, fontSize: 11, padding: [0, 0, 0, 4] }, axisLabel: { color: text, fontSize: 11, formatter: axisCurrency }, splitLine: { lineStyle: { color: border, type: 'dashed', opacity: 0.64 } } }, series: [{ name: '預估費用', type: 'line' as const, data: props.data.map((point) => point.totalCost), smooth: 0.3, showSymbol: false, lineStyle: { width: 2.4, color: primary }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${primary}66` }, { offset: 1, color: `${primary}05` }]) }, emphasis: { focus: 'series' } }] }
}
function renderChart() { if (!chart.value || !hasData.value) return; try { errorMessage.value = ''; chart.value.setOption(buildOption(), { notMerge: true, lazyUpdate: true }); isReady.value = true } catch { errorMessage.value = '無法顯示費用趨勢，請稍後再試。' } }
function initializeChart() { if (!chartElement.value || chart.value) return; try { chart.value = echarts.init(chartElement.value, undefined, { renderer: 'canvas' }); chart.value.showLoading('default', { text: '載入費用趨勢…', color: cssColor('--color-secondary'), textColor: cssColor('--color-text-muted'), maskColor: 'transparent' }); renderChart(); loadingTimer = window.setTimeout(() => { isLoading.value = false; chart.value?.hideLoading() }, 220); resizeObserver = new ResizeObserver(() => chart.value?.resize()); resizeObserver.observe(chartElement.value) } catch { isLoading.value = false; errorMessage.value = '無法顯示費用趨勢，請稍後再試。' } }
watch(() => [props.data, props.theme, animationEnabled.value], async () => { await nextTick(); renderChart() })
onMounted(initializeChart); onBeforeUnmount(() => { if (loadingTimer) window.clearTimeout(loadingTimer); resizeObserver?.disconnect(); chart.value?.dispose() })
</script>

<template>
  <div class="cost-trend-chart">
    <p class="sr-only">{{ summary }}</p>
    <div v-if="errorMessage" class="cost-trend-chart__state" role="alert"><strong>圖表暫時無法使用</strong><span>{{ errorMessage }}</span></div>
    <div v-else-if="!hasData" class="cost-trend-chart__state"><strong>暫無資料</strong><span>請調整日期範圍後再查看費用趨勢。</span></div>
    <div v-else ref="chartElement" class="cost-trend-chart__canvas" data-testid="cost-trend-chart" :data-chart-rendered="isReady ? 'true' : 'false'" role="img" :aria-label="summary" />
    <div v-if="isLoading && hasData && !errorMessage" class="cost-trend-chart__loading" role="status">載入圖表中</div>
  </div>
</template>

<style scoped>
.cost-trend-chart { position: relative; min-width: 0; }.cost-trend-chart__canvas, .cost-trend-chart__state { min-height: 20rem; }.cost-trend-chart__state { display: grid; place-content: center; gap: var(--space-2); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text-muted); text-align: center; }.cost-trend-chart__state strong { color: var(--color-text); }.cost-trend-chart__state span, .cost-trend-chart__loading { font-size: 0.8125rem; }.cost-trend-chart__loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--color-text-muted); background: color-mix(in srgb, var(--color-surface) 68%, transparent); pointer-events: none; }.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }@media (max-width: 40rem) { .cost-trend-chart__canvas, .cost-trend-chart__state, .cost-trend-chart__loading { min-height: 17rem; } }
</style>
