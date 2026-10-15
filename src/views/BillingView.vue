<script setup lang="ts">
import { Activity, Braces, CircleDollarSign, Download, ReceiptText } from '@lucide/vue'
import { computed, defineAsyncComponent } from 'vue'
import RangeSelector from '../components/dashboard/RangeSelector.vue'
import UsageRecordTable from '../components/usage-billing/UsageRecordTable.vue'
import PageScaffold from '../components/ui/PageScaffold.vue'
import { useDashboardStore } from '../stores/dashboard'
import { useUiStore } from '../stores/ui'
import { createUsageCsv, createUsageCsvFilename, formatMetricValue } from '../utils/analytics'

const dashboardStore = useDashboardStore()
const uiStore = useUiStore()
const UsageVolumeChart = defineAsyncComponent(() => import('../components/usage-billing/UsageVolumeChart.vue'))
const CostTrendChart = defineAsyncComponent(() => import('../components/usage-billing/CostTrendChart.vue'))
const billing = computed(() => dashboardStore.usageBilling)
const kpis = computed(() => [
  { label: 'Token 使用總量', value: billing.value.totalTokens, format: 'tokens' as const, icon: Braces, note: '輸入與輸出 Token 合計' },
  { label: '請求總數', value: billing.value.totalRequests, format: 'number' as const, icon: Activity, note: '目前日期範圍內的示範請求' },
  { label: '預估總費用', value: billing.value.totalCost, format: 'currency' as const, icon: CircleDollarSign, note: '依模型示範定價計算' },
  { label: '每次請求平均費用', value: billing.value.averageRequestCost, format: 'currency' as const, icon: ReceiptText, note: '預估總費用 ÷ 請求總數' },
])

function exportCsv() {
  const csv = createUsageCsv(billing.value.records, billing.value.rangeLabel)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = createUsageCsvFilename(billing.value.records)
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <PageScaffold title="使用量與費用" summary="檢視 AI 使用量、預估費用與每日模型成本組成；所有費用均為示範資料估算。">
    <template #header-actions><RangeSelector :range="dashboardStore.selectedRange" @update:range="dashboardStore.setRange" /></template>
    <div class="billing-page">
      <p class="billing-page__range" aria-live="polite">統計期間：{{ billing.rangeLabel }}（UTC）</p>
      <section class="billing-page__kpis" aria-label="使用量與費用統計">
        <article v-for="kpi in kpis" :key="kpi.label" class="billing-kpi" :data-testid="`billing-kpi-${kpi.label}`"><span class="billing-kpi__icon" aria-hidden="true"><component :is="kpi.icon" :size="18" stroke-width="1.9" /></span><p>{{ kpi.label }}</p><strong>{{ formatMetricValue(kpi.format, kpi.value) }}</strong><small>{{ kpi.note }}</small></article>
      </section>
      <section class="billing-page__chart-grid" aria-label="使用量與費用趨勢">
        <article class="billing-panel" aria-labelledby="usage-volume-title"><header class="billing-panel__header"><div><p class="billing-panel__eyebrow">使用量分析</p><h2 id="usage-volume-title">Token 與請求數趨勢</h2></div><span>依期間彙總</span></header><UsageVolumeChart :data="billing.trendSeries" :theme="uiStore.theme" /></article>
        <article class="billing-panel" aria-labelledby="cost-trend-title"><header class="billing-panel__header"><div><p class="billing-panel__eyebrow">費用分析</p><h2 id="cost-trend-title">預估費用趨勢</h2></div><span>{{ formatMetricValue('currency', billing.totalCost) }}</span></header><CostTrendChart :data="billing.trendSeries" :theme="uiStore.theme" /></article>
      </section>
      <section class="billing-page__details-grid">
        <article class="billing-panel" aria-labelledby="model-cost-title"><header class="billing-panel__header"><div><p class="billing-panel__eyebrow">模型成本</p><h2 id="model-cost-title">模型費用分布</h2></div><span>預估費用占比</span></header><div v-if="billing.modelCosts.some((item) => item.requestCount)" class="model-cost-list" data-testid="model-cost-distribution"><div v-for="item in billing.modelCosts" :key="item.model.id" class="model-cost-list__item"><div class="model-cost-list__topline"><span><i :style="{ background: `var(${item.model.colorToken})` }" aria-hidden="true" />{{ item.model.name }}</span><strong>{{ formatMetricValue('currency', item.totalCost) }}</strong></div><div class="model-cost-list__track" aria-hidden="true"><i :style="{ width: `${Math.max(item.costPercentage, item.totalCost > 0 ? 2 : 0)}%`, background: `var(${item.model.colorToken})` }" /></div><div class="model-cost-list__meta"><span>{{ formatMetricValue('tokens', item.totalTokens) }} Token · {{ formatMetricValue('number', item.requestCount) }} 次請求</span><span>{{ formatMetricValue('percentage', item.costPercentage) }}</span></div></div></div><div v-else class="billing-panel__empty"><strong>暫無資料</strong><span>此日期範圍沒有模型成本資料。</span></div></article>
        <article class="billing-panel billing-panel--records" aria-labelledby="usage-records-title"><header class="billing-panel__header billing-panel__header--records"><div><p class="billing-panel__eyebrow">使用紀錄</p><h2 id="usage-records-title">每日使用明細</h2><small>每日、每模型使用彙總示範資料；非真實帳單。</small></div><button class="billing-export" type="button" data-testid="export-usage-csv" @click="exportCsv"><Download :size="16" aria-hidden="true" />匯出 CSV</button></header><UsageRecordTable :records="billing.records" /></article>
      </section>
    </div>
  </PageScaffold>
</template>

<style scoped>
.billing-page { display: grid; gap: clamp(var(--space-6), 2.5vw, var(--space-8)); }.billing-page__range { margin: calc(var(--space-4) * -1) 0 0; color: var(--color-text-subtle); font-size: 0.75rem; font-variant-numeric: tabular-nums; }.billing-page__kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }.billing-kpi, .billing-panel { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-surface); }.billing-kpi { padding: var(--space-5); }.billing-kpi__icon { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated)); }.billing-kpi p { margin: var(--space-5) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; font-weight: 600; }.billing-kpi strong { display: block; margin-top: var(--space-2); color: var(--color-text); font-size: clamp(1.5rem, 2.2vw, 2.15rem); font-variant-numeric: tabular-nums; letter-spacing: -0.04em; line-height: 1.1; }.billing-kpi small { display: block; margin-top: var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; }.billing-page__chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); }.billing-page__details-grid { display: grid; grid-template-columns: minmax(18rem, 0.72fr) minmax(0, 1.28fr); gap: var(--space-5); align-items: start; }.billing-panel { padding: var(--space-5); }.billing-panel__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }.billing-panel__eyebrow { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.billing-panel h2 { margin: 0; color: var(--color-text); font-size: 1.0625rem; letter-spacing: -0.02em; }.billing-panel__header > span { flex: 0 0 auto; padding: 0.3125rem var(--space-2); border: 1px solid var(--color-border); border-radius: 999px; color: var(--color-text-muted); font-size: 0.6875rem; font-weight: 600; }.billing-panel__header small { display: block; margin-top: var(--space-2); color: var(--color-text-subtle); font-size: 0.6875rem; }.model-cost-list { display: grid; gap: var(--space-5); }.model-cost-list__topline, .model-cost-list__meta { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }.model-cost-list__topline > span { display: inline-flex; min-width: 0; align-items: center; gap: var(--space-2); color: var(--color-text); font-size: 0.8125rem; font-weight: 700; }.model-cost-list__topline i { flex: 0 0 auto; width: 0.5rem; height: 0.5rem; border-radius: 50%; }.model-cost-list__topline strong { flex: 0 0 auto; color: var(--color-text); font-size: 0.8125rem; font-variant-numeric: tabular-nums; }.model-cost-list__track { height: 0.375rem; margin: var(--space-3) 0 var(--space-2); overflow: hidden; border-radius: 999px; background: var(--color-surface-elevated); }.model-cost-list__track i { display: block; height: 100%; border-radius: inherit; }.model-cost-list__meta { color: var(--color-text-subtle); font-size: 0.6875rem; font-variant-numeric: tabular-nums; }.billing-panel__empty { display: grid; min-height: 18rem; place-content: center; gap: var(--space-2); color: var(--color-text-muted); text-align: center; }.billing-panel__empty strong { color: var(--color-text); }.billing-panel__empty span { font-size: 0.8125rem; }.billing-panel--records { min-width: 0; }.billing-export { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated)); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.billing-export:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 20%, var(--color-surface-elevated)); }@media (max-width: 75rem) { .billing-page__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }.billing-page__chart-grid, .billing-page__details-grid { grid-template-columns: 1fr; } }@media (max-width: 40rem) { .billing-page__kpis { grid-template-columns: 1fr; }.billing-kpi, .billing-panel { padding: var(--space-4); }.billing-panel__header { flex-direction: column; gap: var(--space-2); }.billing-panel__header--records { flex-direction: row; align-items: flex-start; }.billing-export { flex: 0 0 auto; }.model-cost-list__topline > span { max-width: 13rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.model-cost-list__meta { align-items: start; flex-direction: column; gap: var(--space-1); } }
@media (max-width: 40rem) {
  .model-cost-list__topline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .model-cost-list__topline > span {
    max-width: none;
    overflow: visible;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .model-cost-list__topline strong {
    white-space: nowrap;
  }

  .billing-panel__header--records {
    flex-direction: column;
    align-items: stretch;
  }

  .billing-export {
    align-self: flex-start;
  }
}
</style>
