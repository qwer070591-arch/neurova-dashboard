<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import MobileSortControls from '../ui/MobileSortControls.vue'
import type { UsageBillingRecord } from '../../types/analytics'
import { formatMetricValue } from '../../utils/analytics'

const props = defineProps<{ records: readonly UsageBillingRecord[] }>()

type SortKey = 'date' | 'model' | 'requestCount' | 'totalTokens' | 'totalCost'
type PageSize = 10 | 20 | 50

const sortKey = ref<SortKey>('date')
const sortDirection = ref<'ascending' | 'descending'>('descending')
const sortOptions = [
  { value: 'date', label: '日期' },
  { value: 'model', label: '模型名稱' },
  { value: 'requestCount', label: '請求數' },
  { value: 'totalTokens', label: 'Token 使用量' },
  { value: 'totalCost', label: '預估費用' },
]
const pageSize = ref<PageSize>(10)
const currentPage = ref(1)

const sortedRecords = computed(() => [...props.records].sort((first, second) => {
  const direction = sortDirection.value === 'ascending' ? 1 : -1
  if (sortKey.value === 'model') return direction * first.model.name.localeCompare(second.model.name)
  if (sortKey.value === 'date') return direction * first.date.localeCompare(second.date)
  return direction * (first[sortKey.value] - second[sortKey.value])
}))
const totalPages = computed(() => Math.max(1, Math.ceil(sortedRecords.value.length / pageSize.value)))
const visibleRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedRecords.value.slice(start, start + pageSize.value)
})
const rangeSummary = computed(() => {
  const total = sortedRecords.value.length
  if (total === 0) return '暫無資料'
  const first = (currentPage.value - 1) * pageSize.value + 1
  const last = Math.min(currentPage.value * pageSize.value, total)
  return `顯示第 ${first}–${last} 筆，共 ${total} 筆`
})
const shouldShowPager = computed(() => sortedRecords.value.length > pageSize.value)

watch(() => props.records, () => { currentPage.value = 1 })
watch(totalPages, (pages) => { if (currentPage.value > pages) currentPage.value = pages })

function setSort(nextKey: SortKey) {
  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === 'descending' ? 'ascending' : 'descending'
  } else {
    sortKey.value = nextKey
    sortDirection.value = nextKey === 'model' ? 'ascending' : 'descending'
  }
  currentPage.value = 1
}

function selectMobileSort(value: string) {
  if (value !== sortKey.value && sortOptions.some((option) => option.value === value)) setSort(value as SortKey)
}

function setPageSize(event: Event) {
  pageSize.value = Number((event.target as HTMLSelectElement).value) as PageSize
  currentPage.value = 1
}

function previousPage() { currentPage.value = Math.max(1, currentPage.value - 1) }
function nextPage() { currentPage.value = Math.min(totalPages.value, currentPage.value + 1) }
function sortIcon(key: SortKey) { if (sortKey.value !== key) return ArrowUpDown; return sortDirection.value === 'ascending' ? ArrowUp : ArrowDown }
function ariaSort(key: SortKey) { return sortKey.value === key ? sortDirection.value : 'none' }
</script>

<template>
  <div v-if="records.length" class="usage-records" data-testid="usage-record-table">
    <div class="usage-records__toolbar">
      <p class="usage-records__summary" data-testid="usage-pagination-summary" aria-live="polite">{{ rangeSummary }}</p>
      <label class="usage-records__page-size" for="usage-page-size">每頁顯示
        <select id="usage-page-size" data-testid="usage-page-size" :value="pageSize" @change="setPageSize">
          <option :value="10">10 筆</option><option :value="20">20 筆</option><option :value="50">50 筆</option>
        </select>
      </label>
    </div>
    <MobileSortControls id="usage-records" :model-value="sortKey" :options="sortOptions" :direction="sortDirection" @update:model-value="selectMobileSort" @toggle-direction="setSort(sortKey)" />
    <div class="usage-record-table">
      <table>
        <thead><tr>
          <th scope="col" :aria-sort="ariaSort('date')"><button type="button" data-testid="sort-usage-date" @click="setSort('date')">日期<component :is="sortIcon('date')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('model')"><button type="button" data-testid="sort-usage-model" @click="setSort('model')">模型名稱<component :is="sortIcon('model')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('requestCount')"><button type="button" data-testid="sort-usage-requests" @click="setSort('requestCount')">請求數<component :is="sortIcon('requestCount')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('totalTokens')"><button type="button" data-testid="sort-usage-tokens" @click="setSort('totalTokens')">Token 使用量<component :is="sortIcon('totalTokens')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('totalCost')"><button type="button" data-testid="sort-usage-cost" @click="setSort('totalCost')">預估費用<component :is="sortIcon('totalCost')" :size="14" aria-hidden="true" /></button></th>
        </tr></thead>
        <tbody><tr v-for="record in visibleRecords" :key="`${record.date}-${record.model.id}`" :data-testid="`usage-record-${record.date}-${record.model.id}`">
          <td data-label="日期">{{ record.label }}</td><td data-label="模型名稱"><span class="usage-record-table__model"><i :style="{ background: `var(${record.model.colorToken})` }" aria-hidden="true" />{{ record.model.name }}</span></td><td data-label="請求數">{{ formatMetricValue('number', record.requestCount) }}</td><td data-label="Token 使用量">{{ formatMetricValue('tokens', record.totalTokens) }}</td><td data-label="預估費用">{{ formatMetricValue('currency', record.totalCost) }}</td>
        </tr></tbody>
      </table>
    </div>
    <nav v-if="shouldShowPager" class="usage-records__pagination" aria-label="每日使用明細分頁">
      <button type="button" data-testid="usage-page-previous" :disabled="currentPage === 1" @click="previousPage"><ArrowLeft :size="16" aria-hidden="true" />上一頁</button>
      <span data-testid="usage-page-current" aria-live="polite">第 {{ currentPage }} 頁，共 {{ totalPages }} 頁</span>
      <button type="button" data-testid="usage-page-next" :disabled="currentPage === totalPages" @click="nextPage">下一頁<ArrowRight :size="16" aria-hidden="true" /></button>
    </nav>
  </div>
  <div v-else class="usage-record-table__empty"><strong>暫無資料</strong><span>此日期範圍沒有每日使用彙總資料。</span></div>
</template>

<style scoped>
.usage-records { min-width: 0; }.usage-records__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }.usage-records__summary { margin: 0; color: var(--color-text-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; }.usage-records__page-size { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.usage-records__page-size select { min-height: 2.75rem; padding: 0 var(--space-7) 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface-elevated); font: inherit; }.usage-record-table { overflow: auto; }.usage-record-table table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }.usage-record-table th { padding: 0 var(--space-3) var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em; text-align: right; text-transform: uppercase; white-space: nowrap; }.usage-record-table th:first-child, .usage-record-table td:first-child { padding-left: 0; text-align: left; }.usage-record-table th:last-child, .usage-record-table td:last-child { padding-right: 0; }.usage-record-table th button { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: flex-end; gap: 0.25rem; color: inherit; background: transparent; font: inherit; letter-spacing: inherit; text-transform: inherit; }.usage-record-table th:first-child button { justify-content: flex-start; }.usage-record-table td { padding: var(--space-4) var(--space-3); border-top: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent); color: var(--color-text-muted); font-size: 0.8125rem; text-align: right; white-space: nowrap; }.usage-record-table__model { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-text); }.usage-record-table__model i { width: 0.5rem; height: 0.5rem; border-radius: 50%; }.usage-records__pagination { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }.usage-records__pagination span { min-width: 7.5rem; color: var(--color-text-muted); font-size: 0.75rem; text-align: center; font-variant-numeric: tabular-nums; }.usage-records__pagination button { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); font-size: 0.75rem; font-weight: 700; }.usage-records__pagination button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border)); color: var(--color-primary-strong); }.usage-records__pagination button:disabled { cursor: not-allowed; opacity: 0.45; }.usage-record-table__empty { display: grid; min-height: 12rem; place-content: center; gap: var(--space-2); color: var(--color-text-muted); text-align: center; }.usage-record-table__empty strong { color: var(--color-text); }.usage-record-table__empty span { font-size: 0.8125rem; }@media (max-width: 48rem) { .usage-records__toolbar { align-items: start; flex-direction: column; }.usage-records__page-size { width: 100%; justify-content: space-between; }.usage-records__page-size select { flex: 0 0 auto; }.usage-record-table { overflow: visible; }.usage-record-table table, .usage-record-table tbody, .usage-record-table tr, .usage-record-table td { display: block; }.usage-record-table thead { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }.usage-record-table tbody { display: grid; gap: var(--space-3); }.usage-record-table tbody tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); }.usage-record-table td, .usage-record-table th:first-child, .usage-record-table td:first-child { padding: 0; border: 0; text-align: left; white-space: normal; }.usage-record-table td::before { display: block; margin-bottom: 0.125rem; color: var(--color-text-subtle); content: attr(data-label); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }.usage-record-table td:first-child, .usage-record-table td:nth-child(2) { grid-column: 1 / -1; }.usage-record-table td:first-child::before { display: none; }.usage-records__pagination { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: var(--space-2); }.usage-records__pagination button { min-width: 0; padding: 0 var(--space-2); }.usage-records__pagination span { min-width: 0; font-size: 0.6875rem; } }
@media (max-width: 40rem) {
  .usage-records__page-size {
    white-space: normal;
  }

  .usage-records__page-size select {
    min-width: 4.5rem;
  }
}
</style>
