<script setup lang="ts">
import { BellRing, Database, Info, Palette, RotateCcw, Save, SlidersHorizontal, Sparkles } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import packageInfo from '../../package.json'
import PageScaffold from '../components/ui/PageScaffold.vue'
import UserConfirmDialog from '../components/users/UserConfirmDialog.vue'
import { useSettingsStore } from '../stores/settings'
import { useUiStore, type ThemePreference } from '../stores/ui'
import { useUsersStore } from '../stores/users'
import { validateDisplayName } from '../utils/settings'
import type { NotificationCategory } from '../utils/header'

type ResetAction = 'settings' | 'notifications' | 'users'
const settings = useSettingsStore()
const ui = useUiStore()
const users = useUsersStore()
const nameDraft = ref(settings.displayName)
const nameError = ref<string | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const pendingReset = ref<ResetAction | null>(null)
const returnFocus = ref<HTMLButtonElement | null>(null)
const toast = ref<{ message: string; tone: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const themeChoices: { value: ThemePreference; title: string; description: string }[] = [
  { value: 'dark', title: '深色模式', description: '使用 NEUROVA 的深色介面。' },
  { value: 'light', title: '淺色模式', description: '適合明亮環境的淺色介面。' },
  { value: 'system', title: '跟隨系統', description: '依裝置外觀偏好自動切換。' },
]
const notificationChoices: { value: NotificationCategory; title: string; description: string }[] = [
  { value: 'usage', title: '使用量與費用', description: '使用量摘要與預估費用的示範通知。' },
  { value: 'analytics', title: '分析與活動', description: '模型比較及活動紀錄的示範通知。' },
]
const resetContent = {
  settings: { title: '重設系統設定？', description: '顯示名稱、通知類別、外觀及減少動畫偏好將恢復預設；不會清除通知已讀狀態或使用者資料。', label: '重設設定' },
  notifications: { title: '清除通知已讀狀態？', description: '所有示範通知將恢復未讀；已停用的通知類別與其他設定不受影響。', label: '清除已讀狀態' },
  users: { title: '重設使用者示範資料？', description: '此瀏覽器中示範使用者的新增、編輯、狀態與刪除變更將還原；不涉及真實帳號。', label: '重設使用者資料' },
} satisfies Record<ResetAction, { title: string; description: string; label: string }>
const confirmation = computed(() => pendingReset.value ? resetContent[pendingReset.value] : null)

watch(() => settings.displayName, (value) => { nameDraft.value = value })
onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })

function notify(message: string, tone: 'success' | 'error' = 'success') {
  toast.value = { message, tone }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 4_000)
}
function resultFeedback(saved: boolean, success: string) {
  notify(saved ? success : '已套用於目前頁面，但瀏覽器儲存空間不可用；重新整理後可能無法保留。', saved ? 'success' : 'error')
}
function validateName() { nameError.value = validateDisplayName(nameDraft.value).error }
function saveName() {
  const result = settings.saveDisplayName(nameDraft.value)
  nameError.value = result.error
  if (result.error) { void nextTick(() => nameInput.value?.focus()); notify('請修正顯示名稱後再儲存。', 'error'); return }
  nameDraft.value = settings.displayName
  resultFeedback(result.saved, '顯示名稱已儲存，頁首名稱已同步更新。')
}
function setTheme(value: ThemePreference) { resultFeedback(ui.setThemePreference(value), `已切換至「${themeChoices.find((choice) => choice.value === value)?.title}」。`) }
function setNotification(category: NotificationCategory, event: Event) {
  resultFeedback(settings.setNotificationEnabled(category, (event.target as HTMLInputElement).checked), '示範通知類別已更新。')
}
function setMotion(event: Event) { resultFeedback(settings.setReducedMotion((event.target as HTMLInputElement).checked), '動畫偏好已更新。') }
function openConfirmation(action: ResetAction, trigger: HTMLButtonElement) { returnFocus.value = trigger; pendingReset.value = action }
function closeConfirmation() { pendingReset.value = null; void nextTick(() => returnFocus.value?.focus()) }
function confirmReset() {
  const action = pendingReset.value
  if (!action) return
  let saved = true
  let message = ''
  if (action === 'settings') {
    const settingsSaved = settings.resetSettings()
    const themeSaved = ui.setThemePreference('dark')
    saved = settingsSaved && themeSaved
    nameDraft.value = settings.displayName
    nameError.value = null
    message = '系統設定已恢復預設。'
  } else if (action === 'notifications') {
    saved = settings.clearNotificationReadState()
    message = '示範通知已讀狀態已清除。'
  } else {
    users.resetDemoData()
    saved = users.persistenceStatus === 'available'
    message = '使用者管理示範資料已重設。'
  }
  closeConfirmation()
  resultFeedback(saved, message)
}
</script>

<template>
  <PageScaffold title="系統設定" summary="管理此瀏覽器中的示範工作區偏好；不會變更真實帳號或伺服器設定。">
    <div class="settings-page">
      <aside v-if="settings.persistenceStatus !== 'available'" class="settings-warning" role="alert">{{ settings.persistenceStatus === 'recovered' ? '偵測到損壞的設定資料，已安全載入預設值。' : '瀏覽器儲存空間不可用；設定仍可暫時使用，但重新整理後可能無法保留。' }}</aside>
      <div class="settings-grid">
        <section class="settings-card" aria-labelledby="settings-profile-title">
          <header class="settings-card__header"><SlidersHorizontal :size="19" aria-hidden="true" /><div><h2 id="settings-profile-title">個人偏好</h2><p>僅修改此示範工作區的顯示資訊。</p></div></header>
          <form class="settings-name-form" @submit.prevent="saveName">
            <label for="settings-display-name">顯示名稱</label>
            <div class="settings-name-form__controls"><input id="settings-display-name" ref="nameInput" v-model="nameDraft" type="text" maxlength="80" autocomplete="nickname" :aria-invalid="Boolean(nameError)" :aria-describedby="nameError ? 'settings-name-error' : 'settings-name-hint'" @blur="validateName" /><button type="submit" class="settings-primary"><Save :size="16" aria-hidden="true" />儲存名稱</button></div>
            <small v-if="nameError" id="settings-name-error" class="settings-error" role="alert">{{ nameError }}</small><small v-else id="settings-name-hint">必填，最多 40 個字元；不會修改真實帳號。</small>
          </form>
          <div class="settings-readonly"><span>介面語言</span><strong>繁體中文（台灣）</strong><small>目前僅支援繁體中文（台灣）。</small></div>
        </section>
        <section class="settings-card" aria-labelledby="settings-theme-title">
          <header class="settings-card__header"><Palette :size="19" aria-hidden="true" /><div><h2 id="settings-theme-title">外觀設定</h2><p>此設定也會同步頁首的主題切換按鈕。</p></div></header>
          <fieldset class="settings-choice-group"><legend>介面主題</legend><label v-for="choice in themeChoices" :key="choice.value" class="settings-choice" :class="{ 'settings-choice--selected': ui.themePreference === choice.value }"><input type="radio" name="settings-theme" :value="choice.value" :checked="ui.themePreference === choice.value" @change="setTheme(choice.value)" /><span><strong>{{ choice.title }}</strong><small>{{ choice.description }}</small></span></label></fieldset>
          <p class="settings-caption">目前顯示：{{ ui.theme === 'dark' ? '深色模式' : '淺色模式' }}</p>
        </section>
        <section class="settings-card" aria-labelledby="settings-notifications-title">
          <header class="settings-card__header"><BellRing :size="19" aria-hidden="true" /><div><h2 id="settings-notifications-title">通知偏好</h2><p>僅篩選此瀏覽器的示範通知，不影響電子郵件或即時推播。</p></div></header>
          <label v-for="choice in notificationChoices" :key="choice.value" class="settings-toggle-row"><span><strong>{{ choice.title }}</strong><small>{{ choice.description }}</small></span><input type="checkbox" role="switch" :aria-label="choice.title" :checked="settings.notificationPreferences[choice.value]" @change="setNotification(choice.value, $event)" /></label>
          <p class="settings-caption">關閉類別不會刪除已讀狀態；重新啟用後會恢復原本狀態。</p>
        </section>
        <section class="settings-card" aria-labelledby="settings-experience-title">
          <header class="settings-card__header"><Sparkles :size="19" aria-hidden="true" /><div><h2 id="settings-experience-title">使用體驗</h2><p>保留清楚的互動狀態，減少非必要動態。</p></div></header>
          <label class="settings-toggle-row"><span><strong>減少動畫效果</strong><small>縮短過場與裝飾動畫；系統的減少動態設定仍會生效。</small></span><input type="checkbox" role="switch" aria-label="減少動畫效果" :checked="settings.reducedMotion" @change="setMotion" /></label>
        </section>
        <section class="settings-card settings-card--wide" aria-labelledby="settings-data-title">
          <header class="settings-card__header"><Database :size="19" aria-hidden="true" /><div><h2 id="settings-data-title">示範資料管理</h2><p>每項操作僅影響所列出的本機資料，執行前都需確認。</p></div></header>
          <div class="settings-data-actions">
            <div><strong>重設系統設定</strong><small>還原名稱、主題、通知類別與動畫偏好；不清除通知已讀。</small><button type="button" class="settings-secondary" @click="openConfirmation('settings', $event.currentTarget as HTMLButtonElement)"><RotateCcw :size="16" aria-hidden="true" />重設設定</button></div>
            <div><strong>清除示範通知已讀狀態</strong><small>只還原通知已讀狀態；不影響通知類別開關。</small><button type="button" class="settings-secondary" @click="openConfirmation('notifications', $event.currentTarget as HTMLButtonElement)"><RotateCcw :size="16" aria-hidden="true" />清除已讀</button></div>
            <div><strong>重設使用者管理示範資料</strong><small>還原此瀏覽器的示範使用者資料；不影響分析資料。</small><button type="button" class="settings-danger" @click="openConfirmation('users', $event.currentTarget as HTMLButtonElement)"><RotateCcw :size="16" aria-hidden="true" />重設使用者</button></div>
          </div>
        </section>
        <section class="settings-card settings-card--wide" aria-labelledby="settings-info-title">
          <header class="settings-card__header"><Info :size="19" aria-hidden="true" /><div><h2 id="settings-info-title">系統資訊</h2><p>此頁顯示可查證的專案資訊，非正式服務版本聲明。</p></div></header>
          <dl class="settings-info"><div><dt>專案名稱</dt><dd>NEUROVA</dd></div><div><dt>應用程式類型</dt><dd>AI 分析管理平台示範專案</dd></div><div><dt>前端技術</dt><dd>Vue 3、TypeScript、Vite、Pinia、ECharts</dd></div><div><dt>資料來源</dt><dd>固定且可重現的示範資料</dd></div><div><dt>資料保存</dt><dd>部分偏好與示範操作保存在此瀏覽器</dd></div><div><dt>後端服務</dt><dd>無，純前端示範</dd></div><div><dt>示範程式版本</dt><dd>{{ packageInfo.version }}（非正式產品版本）</dd></div></dl>
        </section>
      </div>
    </div>
    <div v-if="toast" class="settings-toast" :class="`settings-toast--${toast.tone}`" :role="toast.tone === 'error' ? 'alert' : 'status'">{{ toast.message }}</div>
    <UserConfirmDialog v-if="confirmation" :title="confirmation.title" :description="confirmation.description" :confirm-label="confirmation.label" :tone="pendingReset === 'users' ? 'danger' : 'warning'" @close="closeConfirmation" @confirm="confirmReset" />
  </PageScaffold>
</template>

<style scoped>
.settings-page { width: min(100%, 72rem); min-width: 0; }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); }
.settings-card, .settings-warning { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-surface); }
.settings-card { padding: var(--space-6); }
.settings-card--wide { grid-column: 1 / -1; }
.settings-card__header { display: flex; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-5); }
.settings-card__header > svg { flex: 0 0 auto; color: var(--color-primary-strong); }
.settings-card__header > div { min-width: 0; }
.settings-card h2 { margin: 0; color: var(--color-text); font-size: 1.0625rem; }
.settings-card__header p, .settings-caption { margin: var(--space-1) 0 0; color: var(--color-text-muted); font-size: .8125rem; overflow-wrap: anywhere; }
.settings-name-form { display: grid; gap: var(--space-2); }
.settings-name-form label, .settings-choice-group legend { color: var(--color-text); font-size: .8125rem; font-weight: 700; }
.settings-name-form__controls { display: flex; min-width: 0; gap: var(--space-2); }
.settings-name-form input { flex: 1; width: 100%; min-width: 0; min-height: 2.75rem; padding: 0 var(--space-3); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface-muted); }
.settings-name-form input[aria-invalid='true'] { border-color: var(--color-error); }
.settings-name-form small, .settings-readonly small { color: var(--color-text-muted); font-size: .75rem; }
.settings-name-form .settings-error { color: var(--color-error-text); }
.settings-primary, .settings-secondary, .settings-danger { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border-radius: var(--radius-sm); font-size: .8125rem; font-weight: 700; white-space: nowrap; }
.settings-primary { color: #fff; background: var(--color-primary-action); }
.settings-secondary { border: 1px solid var(--color-border-strong); color: var(--color-text); background: var(--color-surface-elevated); }
.settings-danger { border: 1px solid color-mix(in srgb, var(--color-error) 50%, var(--color-border)); color: var(--color-error-text); background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface)); }
.settings-primary:hover { background: var(--color-primary-action-hover); }
.settings-secondary:hover, .settings-danger:hover { border-color: var(--color-primary); }
.settings-readonly { display: grid; gap: var(--space-1); margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
.settings-readonly span { color: var(--color-text-muted); font-size: .8125rem; }
.settings-readonly strong { color: var(--color-text); font-size: .875rem; }
.settings-choice-group { display: grid; gap: var(--space-2); margin: 0; padding: 0; border: 0; }
.settings-choice-group legend { margin-bottom: var(--space-2); }
.settings-choice, .settings-toggle-row { display: flex; min-width: 0; min-height: 3.75rem; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-muted); cursor: pointer; }
.settings-choice--selected { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface)); }
.settings-choice input { flex: 0 0 auto; width: 1.125rem; height: 1.125rem; accent-color: var(--color-primary); }
.settings-choice span, .settings-toggle-row span { display: grid; min-width: 0; gap: var(--space-1); }
.settings-choice strong, .settings-toggle-row strong { color: var(--color-text); font-size: .8125rem; }
.settings-choice small, .settings-toggle-row small { color: var(--color-text-muted); font-size: .75rem; overflow-wrap: anywhere; }
.settings-toggle-row { justify-content: space-between; margin-top: var(--space-2); }
.settings-toggle-row input { position: relative; flex: 0 0 auto; width: 2.75rem; height: 1.5rem; margin: 0; appearance: none; border: 1px solid var(--color-border-strong); border-radius: 999px; background: var(--color-surface-elevated); cursor: pointer; transition: background var(--motion-fast) var(--ease-standard); }
.settings-toggle-row input::before { position: absolute; top: 2px; left: 2px; width: 1.125rem; height: 1.125rem; border-radius: 50%; background: var(--color-text-muted); content: ''; transition: transform var(--motion-fast) var(--ease-standard); }
.settings-toggle-row input:checked { border-color: var(--color-primary); background: var(--color-primary-action); }
.settings-toggle-row input:checked::before { transform: translateX(1.25rem); background: #fff; }
.settings-caption { margin-top: var(--space-3); }
.settings-data-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
.settings-data-actions > div { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface-muted); }
.settings-data-actions strong { color: var(--color-text); font-size: .875rem; }
.settings-data-actions small { flex: 1; color: var(--color-text-muted); font-size: .75rem; overflow-wrap: anywhere; }
.settings-info { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1) var(--space-6); margin: 0; }
.settings-info > div { display: flex; min-width: 0; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); }
.settings-info dt { flex: 0 0 auto; color: var(--color-text-muted); font-size: .8125rem; }
.settings-info dd { margin: 0; color: var(--color-text); font-size: .8125rem; text-align: right; overflow-wrap: anywhere; }
.settings-warning { margin-bottom: var(--space-5); padding: var(--space-4); color: var(--color-warning-text); font-size: .8125rem; }
.settings-toast { position: fixed; z-index: 90; right: var(--space-5); bottom: var(--space-5); max-width: min(24rem, calc(100vw - 2rem)); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); font-size: .8125rem; }
.settings-toast--error { border-color: var(--color-error); }
@media (max-width: 64rem) { .settings-grid { grid-template-columns: 1fr; } .settings-card--wide { grid-column: auto; } .settings-data-actions { grid-template-columns: 1fr; } }
@media (max-width: 40rem) { .settings-card { padding: var(--space-4); } .settings-name-form__controls { flex-direction: column; } .settings-primary { align-self: stretch; } .settings-info { grid-template-columns: 1fr; } .settings-info > div { flex-wrap: wrap; } .settings-info dd { text-align: left; } .settings-toast { right: var(--space-4); bottom: var(--space-4); } }
</style>
