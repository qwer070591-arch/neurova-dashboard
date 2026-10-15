<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useChartMotion } from '../../composables/useChartMotion'
import { AI_MODELS } from '../../mocks/analytics'
import { echarts, type EChartsCoreOption } from '../../services/echarts'
import type { AppTheme } from '../../stores/ui'
import type { AiModel, ModelUsagePoint } from '../../types/analytics'
import { formatInteger } from '../../utils/analytics'

const props = defineProps<{
  data: readonly ModelUsagePoint[]
  theme: AppTheme
}>()

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
const animationEnabled = useChartMotion()
const selectedModelIds = ref<AiModel['id'][]>(AI_MODELS.map((model) => model.id))
const isLoading = ref(true)
const isReady = ref(false)
let resizeObserver: ResizeObserver | undefined
let loadingTimer: number | undefined

const hasData = computed(() => props.data.length > 0)
const selectedModels = computed(() => AI_MODELS.filter((model) => selectedModelIds.value.includes(model.id)))
const summary = computed(() => {
  if (!hasData.value) return '所選日期範圍暫無模型使用趨勢資料。'
  return `顯示 ${selectedModels.value.map((model) => model.name).join('、')} 的每日 Token 使用趨勢。`
})

function cssColor(name: string) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function compactAxisValue(value: number) {
  return new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function toggleModel(id: AiModel['id']) {
  if (selectedModelIds.value.includes(id)) {
    if (selectedModelIds.value.length === 1) return
    selectedModelIds.value = selectedModelIds.value.filter((modelId) => modelId !== id)
    return
  }
  selectedModelIds.value = [...selectedModelIds.value, id]
}

function buildOption(): EChartsCoreOption {
  const text = cssColor('--color-text-muted')
  const border = cssColor('--color-border')
  const surface = cssColor('--color-surface-elevated')
  const labels = props.data.map((point) => point.label)
  const interval = labels.length > 90 ? Math.ceil(labels.length / 7) - 1 : labels.length > 30 ? Math.ceil(labels.length / 6) - 1 : 'auto'
  const compactViewport = window.matchMedia('(max-width: 40rem)').matches

  return {
    animation: animationEnabled.value,
    animationDuration: 300,
    animationEasing: 'cubicOut',
    color: selectedModels.value.map((model) => cssColor(model.colorToken)),
    grid: { top: compactViewport && selectedModels.value.length > 2 ? 70 : 50, right: 16, bottom: 12, left: 12, containLabel: true },
    legend: {
      top: 2,
      left: 0,
      itemWidth: 14,
      itemHeight: 3,
      itemGap: compactViewport ? 8 : 10,
      textStyle: { color: text, fontSize: compactViewport ? 10 : 12 },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text },
      valueFormatter: (value: string | number) => `${formatInteger(Number(value))} Token`,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false },
      axisLabel: { color: text, fontSize: 11, interval, hideOverlap: true, margin: 14 },
    },
    yAxis: {
      type: 'value',
      name: 'Token',
      nameTextStyle: { color: text, fontSize: 11, padding: [0, 0, 0, 4] },
      axisLabel: { color: text, fontSize: 11, formatter: compactAxisValue },
      splitLine: { lineStyle: { color: border, type: 'dashed', opacity: 0.64 } },
    },
    series: selectedModels.value.map((model) => ({
      name: model.name,
      type: 'line' as const,
      data: props.data.map((point) => point.values[model.id]),
      smooth: 0.3,
      showSymbol: false,
      lineStyle: { width: 2.2 },
      emphasis: { focus: 'series' },
    })),
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
  chart.value.showLoading('default', { text: '載入模型趨勢中', color: cssColor('--color-primary'), textColor: cssColor('--color-text-muted'), maskColor: 'transparent' })
  renderChart()
  loadingTimer = window.setTimeout(() => {
    isLoading.value = false
    chart.value?.hideLoading()
  }, 220)
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
  resizeObserver.observe(chartElement.value)
}

watch(() => [props.data, props.theme, selectedModelIds.value, animationEnabled.value], async () => {
  await nextTick()
  renderChart()
})

onMounted(initializeChart)
onBeforeUnmount(() => {
  if (loadingTimer) window.clearTimeout(loadingTimer)
  resizeObserver?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div class="model-trend">
    <div class="model-trend__filters" aria-label="選擇要比較的模型">
      <button
        v-for="model in AI_MODELS"
        :key="model.id"
        class="model-trend__filter"
        :class="{ 'model-trend__filter--active': selectedModelIds.includes(model.id) }"
        type="button"
        :aria-pressed="selectedModelIds.includes(model.id)"
        :data-testid="`trend-model-${model.id}`"
        @click="toggleModel(model.id)"
      >
        <i :style="{ background: `var(${model.colorToken})` }" aria-hidden="true" />
        {{ model.name.replace('Neurova ', '') }}
      </button>
    </div>
    <p class="sr-only">{{ summary }}</p>
    <div v-if="!hasData" class="model-trend__state">
      <strong>暫無模型趨勢資料</strong>
      <span>請嘗試選擇其他日期範圍。</span>
    </div>
    <div
      v-show="hasData"
      ref="chartElement"
      class="model-trend__canvas"
      data-testid="model-trend-chart"
      :data-chart-rendered="isReady ? 'true' : 'false'"
      role="img"
      :aria-label="summary"
    />
    <div v-if="isLoading && hasData" class="model-trend__loading" role="status">模型趨勢載入中</div>
  </div>
</template>

<style scoped>
.model-trend { position: relative; min-width: 0; }
.model-trend__filters { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); }
.model-trend__filter { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: 999px; color: var(--color-text-muted); background: transparent; font-size: 0.75rem; font-weight: 600; transition: color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard); }
.model-trend__filter:hover, .model-trend__filter--active { border-color: color-mix(in srgb, var(--color-primary) 56%, var(--color-border)); color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated)); }
.model-trend__filter i { width: 0.5rem; height: 0.5rem; border-radius: 50%; }
.model-trend__canvas, .model-trend__state { min-height: 20rem; }
.model-trend__state { display: grid; place-content: center; gap: var(--space-2); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text-muted); text-align: center; }
.model-trend__state strong { color: var(--color-text); }
.model-trend__state span, .model-trend__loading { font-size: 0.8125rem; }
.model-trend__loading { position: absolute; right: 0; bottom: 0; left: 0; display: grid; min-height: 20rem; place-items: center; color: var(--color-text-muted); background: color-mix(in srgb, var(--color-surface) 68%, transparent); pointer-events: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 40rem) { .model-trend__canvas, .model-trend__state, .model-trend__loading { min-height: 17rem; } .model-trend__filter { flex: 1 1 calc(50% - var(--space-2)); justify-content: center; } }
</style>
