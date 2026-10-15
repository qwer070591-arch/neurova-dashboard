<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { useDialogFocusGuard } from '../../composables/useDialogFocusGuard'
import type { DemoUser, UserFormErrors, UserFormValues } from '../../types/users'
import { validateUserForm } from '../../utils/users'

const props = defineProps<{ user?: DemoUser; users: readonly DemoUser[] }>()
const emit = defineEmits<{ close: []; submit: [values: UserFormValues] }>()
const dialog = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const discardDialog = ref<HTMLElement | null>(null)
const discardCancelButton = ref<HTMLButtonElement | null>(null)
const showDiscardConfirmation = ref(false)
let discardReturnFocus: HTMLElement | null = null
const form = reactive<UserFormValues>({ name: props.user?.name ?? '', email: props.user?.email ?? '', role: props.user?.role ?? 'viewer', status: props.user?.status ?? 'active' })
const initial = JSON.stringify(form)
const errors = reactive<UserFormErrors>({})
const title = computed(() => props.user ? '編輯使用者' : '新增使用者')
const isDirty = computed(() => JSON.stringify(form) !== initial)
let releaseScrollLock: (() => void) | undefined
useDialogFocusGuard(dialog, nameInput)

onMounted(() => {
  releaseScrollLock = acquireDocumentScrollLock()
  void nextTick(() => nameInput.value?.focus())
})
onBeforeUnmount(() => { releaseScrollLock?.() })

function clearErrors() { delete errors.name; delete errors.email }
function requestClose() {
  if (!isDirty.value) { emit('close'); return }
  if (showDiscardConfirmation.value) return
  discardReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  showDiscardConfirmation.value = true
  void nextTick(() => discardCancelButton.value?.focus())
}
function dismissDiscard() {
  showDiscardConfirmation.value = false
  void nextTick(() => (discardReturnFocus?.isConnected ? discardReturnFocus : nameInput.value)?.focus())
}
function submit() {
  clearErrors()
  const result = validateUserForm(form, props.users, props.user?.id)
  Object.assign(form, result.values)
  Object.assign(errors, result.errors)
  if (Object.keys(errors).length === 0) emit('submit', result.values)
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); showDiscardConfirmation.value ? dismissDiscard() : requestClose(); return }
  const focusScope = showDiscardConfirmation.value ? discardDialog.value : dialog.value
  if (event.key !== 'Tab' || !focusScope) return
  const focusable = Array.from(focusScope.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => element.getClientRects().length > 0)
  if (!focusable.length) return
  const first = focusable[0]!
  const last = focusable.at(-1)!
  if (!focusScope.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>

<template>
  <Teleport to="body">
    <div class="user-dialog__overlay" @click.self="requestClose" @touchmove.self.prevent>
      <section ref="dialog" class="user-dialog" role="dialog" aria-modal="true" aria-labelledby="user-form-title" tabindex="-1" @keydown="handleKeydown">
        <header class="user-dialog__header"><div><p>示範帳號管理</p><h2 id="user-form-title">{{ title }}</h2></div><button type="button" aria-label="關閉表單" @click="requestClose"><X :size="19" aria-hidden="true" /></button></header>
        <p class="user-dialog__notice">此操作只會更新目前瀏覽器中的示範資料，不會建立真實帳號。</p>
        <form novalidate @submit.prevent="submit">
          <label for="user-name">姓名<input id="user-name" ref="nameInput" v-model="form.name" data-testid="user-form-name" :aria-invalid="Boolean(errors.name)" aria-describedby="user-name-error" autocomplete="name" maxlength="60" @input="delete errors.name" /><small v-if="errors.name" id="user-name-error" role="alert">{{ errors.name }}</small></label>
          <label for="user-email">電子郵件<input id="user-email" v-model="form.email" data-testid="user-form-email" :aria-invalid="Boolean(errors.email)" aria-describedby="user-email-error" autocomplete="email" inputmode="email" maxlength="120" @input="delete errors.email" /><small v-if="errors.email" id="user-email-error" role="alert">{{ errors.email }}</small></label>
          <div class="user-dialog__grid"><label for="user-role">角色<select id="user-role" v-model="form.role" data-testid="user-form-role"><option value="admin">管理員</option><option value="editor">編輯者</option><option value="viewer">檢視者</option></select></label><label for="user-status">帳號狀態<select id="user-status" v-model="form.status" data-testid="user-form-status"><option value="active">啟用</option><option value="inactive">停用</option></select></label></div>
          <footer><button type="button" class="user-dialog__secondary" @click="requestClose">取消</button><button type="submit" class="user-dialog__primary" data-testid="submit-user-form">{{ user ? '儲存變更' : '新增使用者' }}</button></footer>
        </form>
        <section v-if="showDiscardConfirmation" ref="discardDialog" class="user-dialog__discard" role="alertdialog" aria-modal="true" aria-label="捨棄尚未儲存的變更"><strong>捨棄尚未儲存的變更？</strong><p>關閉後本次編輯內容不會寫入示範資料。</p><div><button ref="discardCancelButton" type="button" class="user-dialog__secondary" @click="dismissDiscard">繼續編輯</button><button type="button" class="user-dialog__danger" data-testid="discard-user-changes" @click="emit('close')">捨棄變更</button></div></section>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.user-dialog { overscroll-behavior: contain; }
.user-dialog__overlay { position: fixed; z-index: 60; inset: 0; display: grid; place-items: center; padding: var(--space-5); background: var(--color-overlay); backdrop-filter: blur(8px); }.user-dialog { position: relative; width: min(100%, 34rem); max-height: min(86dvh, 46rem); overflow: auto; padding: var(--space-6); border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); }.user-dialog__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); }.user-dialog__header p { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.user-dialog h2 { margin: 0; font-size: 1.25rem; }.user-dialog__header button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; }.user-dialog__header button:hover { color: var(--color-text); background: var(--color-surface); }.user-dialog__notice { margin: var(--space-4) 0; padding: var(--space-3); border: 1px solid color-mix(in srgb, var(--color-secondary) 28%, var(--color-border)); border-radius: var(--radius-sm); color: var(--color-text-muted); background: color-mix(in srgb, var(--color-secondary) 6%, transparent); font-size: 0.75rem; }.user-dialog form { display: grid; gap: var(--space-4); }.user-dialog label { display: grid; gap: var(--space-2); color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; }.user-dialog input, .user-dialog select { width: 100%; min-height: 2.75rem; padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font: inherit; }.user-dialog select { padding-right: var(--space-7); }.user-dialog input[aria-invalid='true'] { border-color: var(--color-error); }.user-dialog label small { color: var(--color-error-text); font-size: 0.6875rem; }.user-dialog__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }.user-dialog footer { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-2); }.user-dialog footer button, .user-dialog__discard button { min-height: 2.75rem; padding: 0 var(--space-4); border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 700; }.user-dialog__secondary { border: 1px solid var(--color-border); color: var(--color-text-muted); background: var(--color-surface); }.user-dialog__primary { color: #fff; background: var(--color-primary-action); }.user-dialog__danger { color: #fff; background: var(--color-error-action); }.user-dialog__discard { position: absolute; inset: 0; display: grid; align-content: center; gap: var(--space-3); padding: var(--space-6); border-radius: inherit; background: color-mix(in srgb, var(--color-surface-elevated) 96%, transparent); }.user-dialog__discard strong { color: var(--color-text); }.user-dialog__discard p { margin: 0; color: var(--color-text-muted); font-size: 0.8125rem; }.user-dialog__discard div { display: flex; justify-content: flex-end; gap: var(--space-3); }
@media (max-width: 32rem) { .user-dialog__overlay { padding: var(--space-3); }.user-dialog { padding: var(--space-5); }.user-dialog__grid { grid-template-columns: 1fr; gap: var(--space-3); }.user-dialog footer, .user-dialog__discard div { display: grid; grid-template-columns: 1fr; } }
</style>
