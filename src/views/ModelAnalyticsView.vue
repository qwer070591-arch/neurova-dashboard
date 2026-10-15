<script setup lang="ts">
import { Activity, Bot, Braces, CircleDollarSign } from '@lucide/vue'
import { computed, defineAsyncComponent, ref } from 'vue'
import ModelComparisonTable from '../components/model-analytics/ModelComparisonTable.vue'
import ModelDetailDialog from '../components/model-analytics/ModelDetailDialog.vue'
import RangeSelector from '../components/dashboard/RangeSelector.vue'
import PageScaffold from '../components/ui/PageScaffold.vue'
import { useDashboardStore } from '../stores/dashboard'
import { useUiStore } from '../stores/ui'
import type { ModelAnalyticsMetric } from '../types/analytics'
import { formatMetricValue } from '../utils/analytics'
import { restoreDialogFocus } from '../utils/dialogFocus'

const dashboardStore = useDashboardStore()
const uiStore = useUiStore()
const ModelTrendChart = defineAsyncComponent(() => import('../components/model-analytics/ModelTrendChart.vue'))
const selectedMetric = ref<ModelAnalyticsMetric | null>(null)
let lastTrigger: HTMLElement | null = null

const kpis = computed(() => [
  { label: '使用中的模型數', value: dashboardStore.modelAnalytics.activeModelCount, format: 'number' as const, icon: Bot, note: '所選期間有請求的模型' },
  { label: '模型總請求數', value: dashboardStore.modelAnalytics.totalRequests, format: 'number' as const, icon: Activity, note: '包含所有請求狀態' },
  { label: 'Token 使用總量', value: dashboardStore.modelAnalytics.totalTokens, format: 'tokens' as const, icon: Braces, note: '輸入與輸出 Token 總和' },
  { label: '預估總費用', value: dashboardStore.modelAnalytics.totalCost, format: 'currency' as const, icon: CircleDollarSign, note: '依模擬模型定價計算' },
])

function openDetails(metric: ModelAnalyticsMetric, trigger: HTMLElement) {
  lastTrigger = trigger
  selectedMetric.value = metric
}

function closeDetails() {
  selectedMetric.value = null
}

function restoreDetailsFocus() {
  if (!selectedMetric.value) restoreDialogFocus(lastTrigger)
}
</script>

<template>
  <PageScaffold title="模型分析" summary="比較 AI 模型的使用量、成本、成功率與回應延遲。">
    <template #header-actions>
      <RangeSelector :range="dashboardStore.selectedRange" @update:range="dashboardStore.setRange" />
    </template>

    <div class="model-analytics-page">
      <p class="model-analytics-page__range" aria-live="polite">統計期間：{{ dashboardStore.modelAnalytics.rangeLabel }} · UTC</p>

      <section class="model-analytics-page__kpis" aria-label="模型關鍵績效指標">
        <article v-for="kpi in kpis" :key="kpi.label" class="model-kpi" :data-testid="`model-kpi-${kpi.label}`">
          <span class="model-kpi__icon" aria-hidden="true"><component :is="kpi.icon" :size="18" stroke-width="1.9" /></span>
          <p>{{ kpi.label }}</p>
          <strong>{{ formatMetricValue(kpi.format, kpi.value) }}</strong>
          <small>{{ kpi.note }}</small>
        </article>
      </section>

      <section class="model-panel" aria-labelledby="model-trend-title">
        <header class="model-panel__header">
          <div><p class="model-panel__eyebrow">模型使用趨勢</p><h2 id="model-trend-title">依模型比較每日 Token 使用量</h2></div>
          <span>可選擇比較模型</span>
        </header>
        <ModelTrendChart :data="dashboardStore.modelAnalytics.usageSeries" :theme="uiStore.theme" />
      </section>

      <section class="model-panel" aria-labelledby="model-comparison-title">
        <header class="model-panel__header">
          <div><p class="model-panel__eyebrow">模型比較</p><h2 id="model-comparison-title">效能與成本摘要</h2></div>
          <span>點選模型查看詳細分析</span>
        </header>
        <ModelComparisonTable :models="dashboardStore.modelAnalytics.models" @select="openDetails" />
      </section>
    </div>

    <Teleport to="body"><Transition name="model-dialog" @after-leave="restoreDetailsFocus"><ModelDetailDialog v-if="selectedMetric" :metric="selectedMetric" @close="closeDetails" /></Transition></Teleport>
  </PageScaffold>
</template>

<style scoped>
.model-analytics-page { display: grid; gap: clamp(var(--space-6), 2.5vw, var(--space-8)); }
.model-analytics-page__range { margin: calc(var(--space-4) * -1) 0 0; color: var(--color-text-subtle); font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.model-analytics-page__kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }
.model-kpi, .model-panel { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-surface); }
.model-kpi { padding: var(--space-5); }.model-kpi__icon { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated)); }.model-kpi p { margin: var(--space-5) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; font-weight: 600; }.model-kpi strong { display: block; margin-top: var(--space-2); color: var(--color-text); font-size: clamp(1.625rem, 2.3vw, 2.25rem); font-variant-numeric: tabular-nums; letter-spacing: -0.04em; line-height: 1.1; }.model-kpi small { display: block; margin-top: var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; }
.model-panel { padding: var(--space-5); }.model-panel__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }.model-panel__eyebrow { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.model-panel h2 { margin: 0; color: var(--color-text); font-size: 1.0625rem; letter-spacing: -0.02em; }.model-panel__header > span { flex: 0 0 auto; padding: 0.3125rem var(--space-2); border: 1px solid var(--color-border); border-radius: 999px; color: var(--color-text-muted); font-size: 0.6875rem; font-weight: 600; }
.model-dialog-enter-active, .model-dialog-leave-active { transition: opacity var(--motion-base) var(--ease-standard); }.model-dialog-enter-active :deep(.model-dialog), .model-dialog-leave-active :deep(.model-dialog) { transition: opacity var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-standard); }.model-dialog-enter-from, .model-dialog-leave-to { opacity: 0; }.model-dialog-enter-from :deep(.model-dialog), .model-dialog-leave-to :deep(.model-dialog) { opacity: 0; transform: translateY(0.75rem) scale(0.98); }
@media (max-width: 75rem) { .model-analytics-page__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 40rem) { .model-analytics-page__kpis { grid-template-columns: 1fr; } .model-kpi, .model-panel { padding: var(--space-4); } .model-panel__header { flex-direction: column; gap: var(--space-2); } }
</style>
