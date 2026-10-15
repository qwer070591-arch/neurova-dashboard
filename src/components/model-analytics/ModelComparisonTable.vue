<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from '@lucide/vue'
import { computed, ref } from 'vue'
import MobileSortControls from '../ui/MobileSortControls.vue'
import type { AiModel, ModelAnalyticsMetric } from '../../types/analytics'
import { formatLatency, formatMetricValue } from '../../utils/analytics'

const props = defineProps<{ models: readonly ModelAnalyticsMetric[] }>()
const emit = defineEmits<{ select: [model: ModelAnalyticsMetric, trigger: HTMLElement] }>()

type SortKey = 'name' | 'requestCount' | 'totalTokens' | 'totalCost' | 'successRate' | 'averageLatency'
const sortKey = ref<SortKey>('requestCount')
const sortDirection = ref<'ascending' | 'descending'>('descending')
const sortOptions = [
  { value: 'name', label: '模型名稱' },
  { value: 'requestCount', label: '請求數' },
  { value: 'totalTokens', label: 'Token 使用量' },
  { value: 'totalCost', label: '預估費用' },
  { value: 'successRate', label: '成功率' },
  { value: 'averageLatency', label: '平均延遲' },
]

const sortedModels = computed(() => [...props.models].sort((first, second) => {
  const direction = sortDirection.value === 'ascending' ? 1 : -1
  if (sortKey.value === 'name') return direction * first.model.name.localeCompare(second.model.name)
  return direction * (first[sortKey.value] - second[sortKey.value])
}))

function setSort(nextKey: SortKey) {
  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === 'descending' ? 'ascending' : 'descending'
    return
  }
  sortKey.value = nextKey
  sortDirection.value = nextKey === 'name' ? 'ascending' : 'descending'
}

function selectMobileSort(value: string) {
  if (value !== sortKey.value && sortOptions.some((option) => option.value === value)) setSort(value as SortKey)
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return ArrowUpDown
  return sortDirection.value === 'ascending' ? ArrowUp : ArrowDown
}

function select(model: ModelAnalyticsMetric, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const trigger = target instanceof HTMLButtonElement ? target : target.querySelector<HTMLButtonElement>('.model-comparison__disclosure button') ?? target
  emit('select', model, trigger)
}

function ariaSort(key: SortKey) {
  return sortKey.value === key ? sortDirection.value : 'none'
}

function compactName(model: AiModel) {
  return model.name.replace('Neurova ', '')
}
</script>

<template>
  <div class="model-comparison" data-testid="model-comparison">
    <MobileSortControls id="model-comparison" :model-value="sortKey" :options="sortOptions" :direction="sortDirection" @update:model-value="selectMobileSort" @toggle-direction="setSort(sortKey)" />
    <table>
      <thead>
        <tr>
          <th scope="col" :aria-sort="ariaSort('name')"><button type="button" data-testid="sort-name" @click="setSort('name')">模型<component :is="sortIcon('name')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('requestCount')"><button type="button" data-testid="sort-requests" @click="setSort('requestCount')">請求數<component :is="sortIcon('requestCount')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('totalTokens')"><button type="button" data-testid="sort-tokens" @click="setSort('totalTokens')">Token 使用量<component :is="sortIcon('totalTokens')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('totalCost')"><button type="button" data-testid="sort-cost" @click="setSort('totalCost')">預估費用<component :is="sortIcon('totalCost')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('successRate')"><button type="button" data-testid="sort-success-rate" @click="setSort('successRate')">成功率<component :is="sortIcon('successRate')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col" :aria-sort="ariaSort('averageLatency')"><button type="button" data-testid="sort-latency" @click="setSort('averageLatency')">平均延遲<component :is="sortIcon('averageLatency')" :size="14" aria-hidden="true" /></button></th>
          <th scope="col"><span class="sr-only">查看詳細資訊</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedModels" :key="item.model.id" :data-testid="`model-row-${item.model.id}`" @click="select(item, $event)">
          <td data-label="模型"><span class="model-comparison__model"><i :style="{ background: `var(${item.model.colorToken})` }" aria-hidden="true" /><strong>{{ compactName(item.model) }}</strong><small>{{ item.model.description }}</small></span></td>
          <td data-label="請求數">{{ formatMetricValue('number', item.requestCount) }}</td>
          <td data-label="Token 使用量">{{ formatMetricValue('tokens', item.totalTokens) }}</td>
          <td data-label="預估費用">{{ formatMetricValue('currency', item.totalCost) }}</td>
          <td data-label="成功率"><span class="model-comparison__success">{{ formatMetricValue('percentage', item.successRate) }}</span></td>
          <td data-label="平均延遲">{{ formatLatency(Math.round(item.averageLatency)) }}</td>
          <td class="model-comparison__disclosure"><button type="button" :aria-label="`查看 ${item.model.name} 詳情`" :data-testid="`model-detail-button-${item.model.id}`" @click.stop="select(item, $event)"><ChevronRight :size="17" aria-hidden="true" /></button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.model-comparison { overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { padding: 0 var(--space-3) var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em; text-align: right; text-transform: uppercase; white-space: nowrap; }
th:first-child, td:first-child { padding-left: 0; text-align: left; } th:last-child, td:last-child { padding-right: 0; }
th button { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: flex-end; gap: 0.25rem; color: inherit; background: transparent; font: inherit; letter-spacing: inherit; text-transform: inherit; }
th:first-child button { justify-content: flex-start; }
tbody tr { cursor: pointer; transition: background var(--motion-fast) var(--ease-standard); } tbody tr:hover { background: color-mix(in srgb, var(--color-primary) 7%, transparent); }
td { padding: var(--space-4) var(--space-3); border-top: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent); color: var(--color-text-muted); font-size: 0.8125rem; text-align: right; white-space: nowrap; }
.model-comparison__model { display: grid; grid-template-columns: auto 1fr; column-gap: var(--space-2); min-width: 10rem; text-align: left; white-space: normal; } .model-comparison__model i { width: 0.5rem; height: 0.5rem; align-self: center; border-radius: 50%; } .model-comparison__model strong { color: var(--color-text); font-size: 0.8125rem; } .model-comparison__model small { grid-column: 2; color: var(--color-text-subtle); font-size: 0.6875rem; }
.model-comparison__success { color: var(--color-success-text); font-weight: 700; } .model-comparison__disclosure { color: var(--color-text-subtle); }
.model-comparison__disclosure button { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-sm); color: inherit; background: transparent; }
.model-comparison__disclosure button:hover { color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 48rem) { .model-comparison { overflow: visible; } table, tbody, tr, td { display: block; } thead { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; } tbody { display: grid; gap: var(--space-3); } tbody tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); } td, th:first-child, td:first-child { padding: 0; border: 0; text-align: left; white-space: normal; } td::before { display: block; margin-bottom: 0.125rem; color: var(--color-text-subtle); content: attr(data-label); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; } td:first-child { grid-column: 1 / -1; } td:first-child::before, .model-comparison__disclosure::before { display: none; } .model-comparison__disclosure { position: absolute; right: var(--space-5); color: var(--color-text-subtle); } }
@media (max-width: 48rem) { tbody tr { position: relative; } td:first-child { padding-right: var(--space-10); } .model-comparison__disclosure { top: var(--space-3); right: var(--space-3); } }
</style>
