<script setup lang="ts">
import { Activity, CheckCircle2, Download, RotateCcw, Search, XCircle } from '@lucide/vue'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import ActivityLogDialog from '../components/activity-logs/ActivityLogDialog.vue'
import ActivityLogTable from '../components/activity-logs/ActivityLogTable.vue'
import MobileFilterSelect from '../components/activity-logs/MobileFilterSelect.vue'
import RangeSelector from '../components/dashboard/RangeSelector.vue'
import MobileSortControls from '../components/ui/MobileSortControls.vue'
import PageScaffold from '../components/ui/PageScaffold.vue'
import { AI_MODELS } from '../mocks/analytics'
import { useDashboardStore } from '../stores/dashboard'
import type { ActivityLogEntry, ActivityEventType, RequestStatus } from '../types/analytics'
import { createActivityLogsCsv, createActivityLogsCsvFilename, filterActivityLogs, formatMetricValue, paginateActivityLogs } from '../utils/analytics'
import { restoreDialogFocus } from '../utils/dialogFocus'

type PageSize = 10 | 20 | 50
const dashboardStore = useDashboardStore()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const pageSize = ref<PageSize>(10)
const currentPage = ref(1)
const timeSort = ref<'ascending' | 'descending'>('descending')
const selectedEntry = ref<ActivityLogEntry | null>(null)
const returnFocus = ref<HTMLButtonElement | null>(null)
const filters = reactive<{ query: string; modelId: 'all' | typeof AI_MODELS[number]['id']; status: 'all' | RequestStatus; eventType: 'all' | ActivityEventType }>({ query: '', modelId: 'all', status: 'all', eventType: 'all' })
const modelFilterOptions = [
  { value: 'all', label: '全部模型' },
  ...AI_MODELS.map((model) => ({ value: model.id, label: model.name })),
]
const statusFilterOptions = [
  { value: 'all', label: '全部狀態' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失敗' },
  { value: 'pending', label: '處理中' },
]
const eventTypeFilterOptions = [
  { value: 'all', label: '全部事件' },
  { value: 'request', label: '請求事件' },
]
const timeSortOptions = [{ value: 'timestamp', label: '發生時間' }]

const activities = computed(() => dashboardStore.activityLogs)
const filteredEntries = computed(() => {
  const entries = filterActivityLogs(activities.value.entries, filters)
  return [...entries].sort((first, second) => timeSort.value === 'descending' ? second.timestamp.localeCompare(first.timestamp) : first.timestamp.localeCompare(second.timestamp))
})
const pagination = computed(() => paginateActivityLogs(filteredEntries.value, currentPage.value, pageSize.value))
const hasFilters = computed(() => Boolean(filters.query || filters.modelId !== 'all' || filters.status !== 'all' || filters.eventType !== 'all'))
const pageSummary = computed(() => pagination.value.firstItem === 0 ? '暫無符合的活動紀錄' : `顯示第 ${pagination.value.firstItem}–${pagination.value.lastItem} 筆，共 ${filteredEntries.value.length} 筆`)

watch([() => filters.query, () => filters.modelId, () => filters.status, () => filters.eventType, pageSize, () => dashboardStore.selectedRange], () => { currentPage.value = 1 })
watch(() => pagination.value.page, (page) => { if (currentPage.value !== page) currentPage.value = page })
onMounted(() => { isLoading.value = false })

function clearFilters() { filters.query = ''; filters.modelId = 'all'; filters.status = 'all'; filters.eventType = 'all' }
function setModelFilter(value: string) { filters.modelId = value as typeof filters.modelId }
function setStatusFilter(value: string) { filters.status = value as typeof filters.status }
function setEventTypeFilter(value: string) { filters.eventType = value as typeof filters.eventType }
function setPageSize(event: Event) { pageSize.value = Number((event.target as HTMLSelectElement).value) as PageSize }
function previousPage() { currentPage.value = Math.max(1, currentPage.value - 1) }
function nextPage() { currentPage.value = Math.min(pagination.value.totalPages, currentPage.value + 1) }
function toggleTimeSort() { timeSort.value = timeSort.value === 'descending' ? 'ascending' : 'descending'; currentPage.value = 1 }
function openEntry(entry: ActivityLogEntry, trigger: HTMLButtonElement) { returnFocus.value = trigger; selectedEntry.value = entry }
function closeEntry() { selectedEntry.value = null; void nextTick(() => restoreDialogFocus(returnFocus.value)) }
function exportCsv() {
  const csv = createActivityLogsCsv(filteredEntries.value, activities.value.rangeLabel)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = createActivityLogsCsvFilename(filteredEntries.value)
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <PageScaffold title="活動紀錄" summary="查詢示範 AI 請求事件，掌握模型執行狀態、Token 使用量與預估費用。">
    <template #header-actions><RangeSelector :range="dashboardStore.selectedRange" @update:range="dashboardStore.setRange" /></template>
    <div class="activity-logs-page">
      <p class="activity-logs-page__range" aria-live="polite">統計期間：{{ activities.rangeLabel }} · UTC</p>
      <section class="activity-logs-page__kpis" aria-label="活動紀錄摘要">
        <article class="activity-kpi" data-testid="activity-kpi-requests"><span aria-hidden="true"><Activity :size="18" /></span><p>請求總數</p><strong>{{ formatMetricValue('number', activities.requestEvents) }}</strong><small>目前期間的請求事件</small></article>
        <article class="activity-kpi" data-testid="activity-kpi-success"><span aria-hidden="true"><CheckCircle2 :size="18" /></span><p>成功請求</p><strong>{{ formatMetricValue('number', activities.successfulRequests) }}</strong><small>狀態為成功的請求事件</small></article>
        <article class="activity-kpi activity-kpi--error" data-testid="activity-kpi-failed"><span aria-hidden="true"><XCircle :size="18" /></span><p>失敗請求</p><strong>{{ formatMetricValue('number', activities.failedRequests) }}</strong><small>狀態為失敗的請求事件</small></article>
        <article class="activity-kpi activity-kpi--success" data-testid="activity-kpi-rate"><span aria-hidden="true"><CheckCircle2 :size="18" /></span><p>成功率</p><strong>{{ formatMetricValue('percentage', activities.successRate) }}</strong><small>成功請求 ÷ 全部請求事件</small></article>
      </section>
      <section class="activity-panel" aria-labelledby="activity-list-title">
        <header class="activity-panel__header"><div><p>示範資料</p><h2 id="activity-list-title">活動紀錄</h2><small>列表僅包含可重現的 Mock 請求事件，不含 API 金鑰或私人 Prompt。</small></div><button type="button" class="activity-export" data-testid="export-activity-csv" :disabled="filteredEntries.length === 0" @click="exportCsv"><Download :size="16" aria-hidden="true" />匯出 CSV</button></header>
        <div class="activity-filters" aria-label="活動紀錄篩選器">
          <label class="activity-filter activity-filter--search"><span>關鍵字搜尋</span><Search :size="16" aria-hidden="true" /><input v-model="filters.query" data-testid="activity-search" type="search" placeholder="搜尋活動識別碼或模型名稱" /></label>
          <div class="activity-filter"><span id="activity-model-filter-label">模型</span><select v-model="filters.modelId" class="activity-filter__native" data-testid="activity-model-filter"><option v-for="option in modelFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><MobileFilterSelect :model-value="filters.modelId" :options="modelFilterOptions" label-id="activity-model-filter-label" id="activity-model-filter" test-id="activity-model-filter" @update:model-value="setModelFilter" /></div>
          <div class="activity-filter"><span id="activity-status-filter-label">狀態</span><select v-model="filters.status" class="activity-filter__native" data-testid="activity-status-filter"><option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><MobileFilterSelect :model-value="filters.status" :options="statusFilterOptions" label-id="activity-status-filter-label" id="activity-status-filter" test-id="activity-status-filter" @update:model-value="setStatusFilter" /></div>
          <div class="activity-filter"><span id="activity-event-filter-label">事件類型</span><select v-model="filters.eventType" class="activity-filter__native" data-testid="activity-event-filter"><option v-for="option in eventTypeFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><MobileFilterSelect :model-value="filters.eventType" :options="eventTypeFilterOptions" label-id="activity-event-filter-label" id="activity-event-filter" test-id="activity-event-filter" @update:model-value="setEventTypeFilter" /></div>
          <button v-if="hasFilters" type="button" class="activity-clear" data-testid="clear-activity-filters" @click="clearFilters"><RotateCcw :size="16" aria-hidden="true" />清除篩選</button>
        </div>
        <div v-if="isLoading" class="activity-state" role="status"><strong>載入中</strong><span>正在整理示範活動紀錄。</span></div>
        <div v-else-if="loadError" class="activity-state activity-state--error" role="alert"><strong>無法載入活動紀錄</strong><span>{{ loadError }}</span></div>
        <template v-else-if="filteredEntries.length">
          <div class="activity-toolbar"><p data-testid="activity-pagination-summary" aria-live="polite">{{ pageSummary }}</p><label for="activity-page-size">每頁顯示<select id="activity-page-size" data-testid="activity-page-size" :value="pageSize" @change="setPageSize"><option :value="10">10 筆</option><option :value="20">20 筆</option><option :value="50">50 筆</option></select></label></div>
          <MobileSortControls id="activity-logs" model-value="timestamp" :options="timeSortOptions" :direction="timeSort" @toggle-direction="toggleTimeSort" />
          <ActivityLogTable :entries="pagination.items" :time-sort="timeSort" @select="openEntry" @toggle-time-sort="toggleTimeSort" />
          <nav v-if="filteredEntries.length > pageSize" class="activity-pagination" aria-label="活動紀錄分頁"><button type="button" data-testid="activity-page-previous" :disabled="pagination.page === 1" @click="previousPage">上一頁</button><span data-testid="activity-page-current" aria-live="polite">第 {{ pagination.page }} 頁，共 {{ pagination.totalPages }} 頁</span><button type="button" data-testid="activity-page-next" :disabled="pagination.page === pagination.totalPages" @click="nextPage">下一頁</button></nav>
        </template>
        <div v-else class="activity-state" data-testid="activity-empty"><strong>暫無符合的活動紀錄</strong><span>請調整搜尋關鍵字或篩選條件。</span><button v-if="hasFilters" type="button" @click="clearFilters">清除篩選</button></div>
      </section>
    </div>
    <ActivityLogDialog v-if="selectedEntry" :entry="selectedEntry" @close="closeEntry" />
  </PageScaffold>
</template>

<style scoped>
.activity-logs-page { display: grid; gap: clamp(var(--space-6), 2.5vw, var(--space-8)); }.activity-logs-page__range { margin: calc(var(--space-4) * -1) 0 0; color: var(--color-text-subtle); font-size: 0.75rem; font-variant-numeric: tabular-nums; }.activity-logs-page__kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }.activity-kpi, .activity-panel { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-surface); }.activity-kpi { padding: var(--space-5); }.activity-kpi > span { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated)); }.activity-kpi--error > span { border-color: color-mix(in srgb, var(--color-error) 34%, var(--color-border)); color: var(--color-error-text); background: color-mix(in srgb, var(--color-error) 10%, var(--color-surface-elevated)); }.activity-kpi--success > span { border-color: color-mix(in srgb, var(--color-success) 34%, var(--color-border)); color: var(--color-success-text); background: color-mix(in srgb, var(--color-success) 10%, var(--color-surface-elevated)); }.activity-kpi p { margin: var(--space-5) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; font-weight: 600; }.activity-kpi strong { display: block; margin-top: var(--space-2); color: var(--color-text); font-size: clamp(1.5rem, 2.2vw, 2.15rem); font-variant-numeric: tabular-nums; letter-spacing: -0.04em; line-height: 1.1; }.activity-kpi small { display: block; margin-top: var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; }.activity-panel { padding: var(--space-5); }.activity-panel__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }.activity-panel__header p { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.activity-panel h2 { margin: 0; font-size: 1.0625rem; }.activity-panel__header small { display: block; max-width: 42rem; margin-top: var(--space-2); color: var(--color-text-subtle); font-size: 0.75rem; }.activity-export, .activity-clear { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated)); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.activity-export:disabled { cursor: not-allowed; opacity: 0.45; }.activity-filters { display: grid; grid-template-columns: minmax(14rem, 1.5fr) repeat(3, minmax(8rem, 1fr)) auto; align-items: end; gap: var(--space-3); padding: var(--space-4); border: 1px solid color-mix(in srgb, var(--color-border) 78%, transparent); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface-elevated) 55%, transparent); }.activity-filter { display: grid; gap: var(--space-1); min-width: 0; color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; }.activity-filter--search { position: relative; }.activity-filter--search svg { position: absolute; bottom: 0.875rem; left: var(--space-3); color: var(--color-text-subtle); pointer-events: none; }.activity-filter input, .activity-filter select, .activity-toolbar select { width: 100%; min-height: 2.75rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font: inherit; }.activity-filter input { min-width: 0; padding: 0 var(--space-3) 0 2.5rem; }.activity-filter select, .activity-toolbar select { padding: 0 var(--space-7) 0 var(--space-3); }.activity-filter--model :deep(.mobile-model-filter) { display: none; }.activity-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin: var(--space-5) 0 var(--space-4); }.activity-toolbar p { margin: 0; color: var(--color-text-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; }.activity-toolbar label { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.activity-toolbar select { width: auto; min-width: 4.5rem; }.activity-pagination { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }.activity-pagination button, .activity-state button { min-height: 2.75rem; padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); font-size: 0.75rem; font-weight: 700; }.activity-pagination button:disabled { cursor: not-allowed; opacity: 0.45; }.activity-pagination span { min-width: 7.5rem; color: var(--color-text-muted); font-size: 0.75rem; text-align: center; font-variant-numeric: tabular-nums; }.activity-state { display: grid; min-height: 16rem; place-content: center; justify-items: center; gap: var(--space-2); color: var(--color-text-muted); text-align: center; }.activity-state strong { color: var(--color-text); }.activity-state span { max-width: 28rem; font-size: 0.8125rem; }.activity-state--error strong { color: var(--color-error-text); }
@media (max-width: 75rem) { .activity-logs-page__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }.activity-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }.activity-filter--search { grid-column: 1 / -1; }.activity-clear { justify-self: start; } }
@media (max-width: 40rem) { .activity-logs-page__kpis { grid-template-columns: 1fr; }.activity-kpi, .activity-panel { padding: var(--space-4); }.activity-panel__header { flex-direction: column; gap: var(--space-3); }.activity-export { align-self: flex-start; }.activity-filters { grid-template-columns: 1fr; padding: var(--space-3); }.activity-filter--search { grid-column: auto; }.activity-filter--model .activity-filter__model-native { display: none; }.activity-filter--model :deep(.mobile-model-filter) { display: block; }.activity-clear { width: 100%; }.activity-toolbar { align-items: stretch; flex-direction: column; }.activity-toolbar label { width: 100%; justify-content: space-between; white-space: normal; }.activity-toolbar select { width: 4.5rem; }.activity-pagination { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: var(--space-2); }.activity-pagination button { min-width: 0; padding: 0 var(--space-2); }.activity-pagination span { min-width: 0; font-size: 0.6875rem; } }
.activity-filter :deep(.mobile-filter-select) { display: none; }
@media (max-width: 40rem) { .activity-filter .activity-filter__native { display: none; }.activity-filter :deep(.mobile-filter-select) { display: block; } }
</style>
