<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { useDialogFocusGuard } from '../../composables/useDialogFocusGuard'

defineProps<{ title: string; description: string; confirmLabel: string; tone?: 'danger' | 'warning' }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
useDialogFocusGuard(dialog, closeButton)

let releaseScrollLock: (() => void) | undefined
onMounted(() => {
  releaseScrollLock = acquireDocumentScrollLock()
  void nextTick(() => closeButton.value?.focus())
})
onBeforeUnmount(() => { releaseScrollLock?.() })

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])'))
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>

<template>
  <Teleport to="body">
    <div class="user-confirm__overlay" @click.self="emit('close')">
      <section ref="dialog" class="user-confirm" role="alertdialog" aria-modal="true" aria-labelledby="user-confirm-title" tabindex="-1" @keydown="handleKeydown">
        <header><span :class="`user-confirm__icon--${tone ?? 'warning'}`"><AlertTriangle :size="20" aria-hidden="true" /></span><button ref="closeButton" type="button" aria-label="關閉確認視窗" @click="emit('close')"><X :size="18" aria-hidden="true" /></button></header>
        <h2 id="user-confirm-title">{{ title }}</h2><p>{{ description }}</p>
        <footer><button type="button" class="user-confirm__cancel" @click="emit('close')">取消</button><button type="button" :class="`user-confirm__action--${tone ?? 'warning'}`" data-testid="confirm-user-action" @click="emit('confirm')">{{ confirmLabel }}</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.user-confirm__overlay { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: var(--space-5); background: var(--color-overlay); backdrop-filter: blur(8px); }.user-confirm { width: min(100%, 28rem); padding: var(--space-6); border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); }.user-confirm header { display: flex; align-items: center; justify-content: space-between; }.user-confirm__icon--warning, .user-confirm__icon--danger { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-md); }.user-confirm__icon--warning { color: var(--color-warning-text); background: color-mix(in srgb, var(--color-warning) 12%, transparent); }.user-confirm__icon--danger { color: var(--color-error-text); background: color-mix(in srgb, var(--color-error) 12%, transparent); }.user-confirm header button { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; }.user-confirm h2 { margin: var(--space-4) 0 0; font-size: 1.125rem; }.user-confirm p { margin: var(--space-2) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; line-height: 1.65; }.user-confirm footer { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-6); }.user-confirm footer button { min-height: 2.75rem; padding: 0 var(--space-4); border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 700; }.user-confirm__cancel { border: 1px solid var(--color-border); color: var(--color-text-muted); background: var(--color-surface); }.user-confirm__action--warning { color: #1c1917; background: var(--color-warning); }.user-confirm__action--danger { color: #fff; background: var(--color-error-action); }
@media (max-width: 32rem) { .user-confirm__overlay { padding: var(--space-3); }.user-confirm { padding: var(--space-5); }.user-confirm footer { display: grid; grid-template-columns: 1fr; } }
</style>
