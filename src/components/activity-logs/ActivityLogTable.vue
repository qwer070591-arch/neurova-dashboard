<script setup lang="ts">
import { ArrowDown, ArrowUp, Eye } from '@lucide/vue'
import type { ActivityLogEntry } from '../../types/analytics'
import { formatDateTime, formatMetricValue, getEventTypeLabel, getStatusLabel } from '../../utils/analytics'

defineProps<{
  entries: readonly ActivityLogEntry[]
  timeSort: 'ascending' | 'descending'
}>()

const emit = defineEmits<{
  select: [entry: ActivityLogEntry, trigger: HTMLButtonElement]
  'toggle-time-sort': []
}>()

function selectEntry(entry: ActivityLogEntry, event: MouseEvent) {
  emit('select', entry, event.currentTarget as HTMLButtonElement)
}
</script>

<template>
  <div class="activity-table" data-testid="activity-log-table">
    <table>
      <thead>
        <tr>
          <th scope="col" :aria-sort="timeSort">
            <button type="button" data-testid="sort-activity-time" @click="emit('toggle-time-sort')">
              發生時間
              <component :is="timeSort === 'descending' ? ArrowDown : ArrowUp" :size="14" aria-hidden="true" />
            </button>
          </th>
          <th scope="col">模型名稱</th>
          <th scope="col">事件類型</th>
          <th scope="col">執行狀態</th>
          <th scope="col">Token 使用量</th>
          <th scope="col">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.id" :data-testid="`activity-row-${entry.id}`">
          <td data-label="發生時間">{{ formatDateTime(entry.timestamp) }}</td>
          <td data-label="模型名稱"><span class="activity-table__model"><i :style="{ background: `var(${entry.model.colorToken})` }" aria-hidden="true" />{{ entry.model.name }}</span></td>
          <td data-label="事件類型">{{ getEventTypeLabel(entry.eventType) }}</td>
          <td data-label="執行狀態"><span class="activity-table__status" :class="`activity-table__status--${entry.status}`">{{ getStatusLabel(entry.status) }}</span></td>
          <td data-label="Token 使用量">{{ formatMetricValue('tokens', entry.totalTokens) }}</td>
          <td data-label="操作"><button type="button" class="activity-table__detail" :data-testid="`activity-detail-${entry.id}`" @click="selectEntry(entry, $event)"><Eye :size="16" aria-hidden="true" />查看詳情</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.activity-table { min-width: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { padding: 0 var(--space-3) var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em; text-align: left; text-transform: uppercase; white-space: nowrap; }
th:first-child, td:first-child { padding-left: 0; } th:last-child, td:last-child { padding-right: 0; text-align: right; }
th button { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-1); color: inherit; background: transparent; font: inherit; letter-spacing: inherit; text-transform: inherit; }
td { padding: var(--space-4) var(--space-3); border-top: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent); color: var(--color-text-muted); font-size: 0.8125rem; white-space: nowrap; }
.activity-table__model { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-text); font-weight: 600; }.activity-table__model i { width: 0.5rem; height: 0.5rem; border-radius: 50%; }
.activity-table__status { display: inline-flex; min-height: 1.625rem; align-items: center; padding: 0 var(--space-2); border: 1px solid var(--color-border); border-radius: 999px; font-size: 0.6875rem; font-weight: 700; }.activity-table__status--success { border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border)); color: var(--color-success-text); background: color-mix(in srgb, var(--color-success) 9%, transparent); }.activity-table__status--failed { border-color: color-mix(in srgb, var(--color-error) 45%, var(--color-border)); color: var(--color-error-text); background: color-mix(in srgb, var(--color-error) 9%, transparent); }.activity-table__status--pending { border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border)); color: var(--color-warning-text); background: color-mix(in srgb, var(--color-warning) 9%, transparent); }
.activity-table__detail { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid color-mix(in srgb, var(--color-primary) 38%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 8%, transparent); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.activity-table__detail:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface-elevated)); }
@media (max-width: 48rem) { .activity-table { overflow: visible; } table, tbody, tr, td { display: block; } thead { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; } tbody { display: grid; gap: var(--space-3); } tbody tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); } td, td:first-child, td:last-child { padding: 0; border: 0; text-align: left; white-space: normal; } td::before { display: block; margin-bottom: 0.125rem; color: var(--color-text-subtle); content: attr(data-label); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; } td:first-child, td:nth-child(2), td:last-child { grid-column: 1 / -1; } td:first-child::before { display: none; } .activity-table__detail { width: 100%; } }
</style>
