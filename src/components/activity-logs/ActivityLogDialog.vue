<script setup lang="ts">
import { X } from '@lucide/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { useDialogFocusGuard } from '../../composables/useDialogFocusGuard'
import type { ActivityLogEntry } from '../../types/analytics'
import { formatDateTime, formatLatency, formatMetricValue, getEventTypeLabel, getStatusLabel } from '../../utils/analytics'

const props = defineProps<{ entry: ActivityLogEntry }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let releaseScrollLock: (() => void) | undefined
useDialogFocusGuard(dialog, closeButton)

onMounted(() => {
  releaseScrollLock = acquireDocumentScrollLock()
  void nextTick(() => closeButton.value?.focus())
})
onBeforeUnmount(() => { releaseScrollLock?.() })

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable.at(-1)!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>

<template>
  <Teleport to="body">
    <div class="activity-dialog__overlay" @click.self="emit('close')" @touchmove.self.prevent>
      <section ref="dialog" class="activity-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" tabindex="-1" @keydown="handleKeydown">
        <header class="activity-dialog__header">
          <div><p>請求事件詳情</p><h2 id="activity-dialog-title">{{ entry.id }}</h2></div>
          <button ref="closeButton" type="button" aria-label="關閉活動詳情" @click="emit('close')"><X :size="19" aria-hidden="true" /></button>
        </header>
        <dl>
          <div><dt>發生時間</dt><dd>{{ formatDateTime(entry.timestamp) }}</dd></div>
          <div><dt>模型名稱</dt><dd><i :style="{ background: `var(${entry.model.colorToken})` }" aria-hidden="true" />{{ entry.model.name }}</dd></div>
          <div><dt>事件類型</dt><dd>{{ getEventTypeLabel(entry.eventType) }}</dd></div>
          <div><dt>執行狀態</dt><dd :class="`activity-dialog__status--${entry.status}`">{{ getStatusLabel(entry.status) }}</dd></div>
          <div><dt>Token 使用量</dt><dd>{{ formatMetricValue('tokens', entry.totalTokens) }}</dd></div>
          <div><dt>預估費用</dt><dd>{{ formatMetricValue('currency', entry.estimatedCost) }}</dd></div>
          <div><dt>執行時間</dt><dd>{{ formatLatency(entry.latencyMs) }}</dd></div>
        </dl>
        <section class="activity-dialog__summary" aria-labelledby="activity-result-summary"><h3 id="activity-result-summary">結果摘要</h3><p>{{ entry.resultSummary }}</p></section>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.activity-dialog { overscroll-behavior: contain; }
.activity-dialog__overlay { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: var(--space-5); background: var(--color-overlay); backdrop-filter: blur(8px); }.activity-dialog { width: min(100%, 38rem); max-height: min(80dvh, 44rem); overflow: auto; padding: var(--space-6); border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); }.activity-dialog__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); }.activity-dialog__header p { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.activity-dialog h2 { margin: 0; overflow-wrap: anywhere; font-size: clamp(1.125rem, 3vw, 1.35rem); }.activity-dialog__header button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; }.activity-dialog__header button:hover { color: var(--color-text); background: var(--color-surface); }dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); margin: var(--space-5) 0 0; }dt { color: var(--color-text-subtle); font-size: 0.6875rem; }dd { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) 0 0; overflow-wrap: anywhere; font-size: 0.875rem; font-variant-numeric: tabular-nums; font-weight: 700; }dd i { width: 0.5rem; height: 0.5rem; flex: 0 0 auto; border-radius: 50%; }.activity-dialog__status--success { color: var(--color-success-text); }.activity-dialog__status--failed { color: var(--color-error-text); }.activity-dialog__status--pending { color: var(--color-warning-text); }.activity-dialog__summary { margin-top: var(--space-5); padding: var(--space-4); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)); }.activity-dialog__summary h3 { margin: 0; font-size: 0.8125rem; }.activity-dialog__summary p { margin: var(--space-2) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; }
@media (max-width: 32rem) { .activity-dialog__overlay { padding: var(--space-3); }.activity-dialog { padding: var(--space-5); }dl { grid-template-columns: 1fr; gap: var(--space-3); } }
</style>
