<script setup lang="ts">
import { X } from '@lucide/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { useDialogFocusGuard } from '../../composables/useDialogFocusGuard'
import type { ModelAnalyticsMetric } from '../../types/analytics'
import { formatLatency, formatMetricValue } from '../../utils/analytics'

const props = defineProps<{ metric: ModelAnalyticsMetric }>()
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
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'))
    .filter((element) => element.getClientRects().length > 0)
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) { event.preventDefault(); dialog.value.focus(); return }
  if (!dialog.value.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>

<template>
  <div class="model-dialog__overlay" @click.self="emit('close')" @touchmove.self.prevent>
    <section ref="dialog" class="model-dialog" role="dialog" aria-modal="true" aria-labelledby="model-dialog-title" tabindex="-1" @keydown="handleKeydown">
      <header class="model-dialog__header">
        <div>
          <p>模型詳細分析</p>
          <h2 id="model-dialog-title"><i :style="{ background: `var(${metric.model.colorToken})` }" aria-hidden="true" />{{ metric.model.name }}</h2>
        </div>
        <button ref="closeButton" type="button" aria-label="關閉模型詳細資訊" @click="emit('close')"><X :size="19" aria-hidden="true" /></button>
      </header>
      <p class="model-dialog__description">{{ metric.model.description }}</p>
      <dl>
        <div><dt>請求數</dt><dd>{{ formatMetricValue('number', metric.requestCount) }}</dd></div>
        <div><dt>Token 使用總量</dt><dd>{{ formatMetricValue('tokens', metric.totalTokens) }}</dd></div>
        <div><dt>成功率</dt><dd class="model-dialog__success">{{ formatMetricValue('percentage', metric.successRate) }}</dd></div>
        <div><dt>平均延遲</dt><dd>{{ formatLatency(Math.round(metric.averageLatency)) }}</dd></div>
        <div><dt>預估費用</dt><dd>{{ formatMetricValue('currency', metric.totalCost) }}</dd></div>
        <div><dt>輸入定價</dt><dd>US${{ metric.model.pricing.inputPerMillion.toFixed(2) }}／百萬 Token</dd></div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.model-dialog__overlay { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: var(--space-5); background: var(--color-overlay); backdrop-filter: blur(8px); }
.model-dialog { width: min(100%, 34rem); max-height: calc(100dvh - 2 * var(--space-5)); overflow-y: auto; overscroll-behavior: contain; padding: var(--space-6); border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); }
.model-dialog__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); }.model-dialog__header p { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.model-dialog h2 { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-size: clamp(1.125rem, 3vw, 1.35rem); }.model-dialog h2 i { width: 0.625rem; height: 0.625rem; border-radius: 50%; }.model-dialog__header button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; }.model-dialog__header button:hover { color: var(--color-text); background: var(--color-surface); }
.model-dialog__description { margin: var(--space-4) 0 0; padding: var(--space-3); border-radius: var(--radius-sm); color: var(--color-text-muted); background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)); font-size: 0.8125rem; }
dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); margin: var(--space-5) 0 0; } dt { color: var(--color-text-subtle); font-size: 0.6875rem; } dd { margin: var(--space-1) 0 0; overflow-wrap: anywhere; font-size: 0.875rem; font-variant-numeric: tabular-nums; font-weight: 700; }.model-dialog__success { color: var(--color-success-text); }
@media (max-width: 32rem) { .model-dialog__overlay { padding: var(--space-3); } .model-dialog { max-height: calc(100dvh - 2 * var(--space-3)); padding: var(--space-5); } dl { grid-template-columns: 1fr; gap: var(--space-3); } }
</style>
