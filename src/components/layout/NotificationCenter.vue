<script setup lang="ts">
import { X } from '@lucide/vue'
import { nextTick, onMounted, ref } from 'vue'
import type { DemoNotification } from '../../utils/header'

const props = defineProps<{ notifications: DemoNotification[]; readIds: string[] }>()
const emit = defineEmits<{
  close: []
  read: [id: string]
  readAll: []
  navigate: [path: string, id: string]
}>()
const closeButton = ref<HTMLButtonElement | null>(null)
onMounted(() => { nextTick(() => closeButton.value?.focus()) })

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <section id="notification-center" class="notification-center" role="dialog" aria-label="示範通知中心" @keydown="onKeydown">
    <div class="notification-center__heading">
      <div><h2>通知中心</h2><p>固定示範通知，非即時推播。</p></div>
      <button ref="closeButton" type="button" class="notification-center__close" aria-label="關閉通知中心" @click="emit('close')"><X :size="18" aria-hidden="true" /></button>
    </div>
    <div class="notification-center__toolbar">
      <span>{{ props.notifications.filter((notification) => !props.readIds.includes(notification.id)).length }} 則未讀</span>
      <button type="button" :disabled="props.notifications.every((notification) => props.readIds.includes(notification.id))" @click="emit('readAll')">全部標記已讀</button>
    </div>
    <div class="notification-center__list">
      <article v-for="notification in props.notifications" :key="notification.id" class="notification-center__item" :class="{ 'notification-center__item--unread': !props.readIds.includes(notification.id) }">
        <div class="notification-center__item-heading">
          <strong>{{ notification.title }}</strong>
          <span>{{ props.readIds.includes(notification.id) ? '已讀' : '未讀' }}</span>
        </div>
        <p>{{ notification.description }}</p>
        <time>{{ notification.time }}</time>
        <div class="notification-center__item-actions">
          <button type="button" @click="emit('navigate', notification.path, notification.id)">前往相關頁面</button>
          <button v-if="!props.readIds.includes(notification.id)" type="button" @click="emit('read', notification.id)">標記已讀</button>
        </div>
      </article>
      <p v-if="!props.notifications.length" class="notification-center__empty">目前沒有啟用的示範通知類別。可至系統設定重新啟用。</p>
    </div>
    <p class="notification-center__footnote">已讀狀態僅儲存在此瀏覽器。</p>
  </section>
</template>

<style scoped>
.notification-center { position: fixed; z-index: 50; top: calc(var(--header-height) + var(--space-2)); right: var(--space-4); display: flex; flex-direction: column; width: min(23rem, calc(100vw - 2rem)); max-height: calc(100dvh - var(--header-height) - 1.5rem); border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface); box-shadow: var(--shadow-float); }
.notification-center__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); padding: var(--space-4); }
.notification-center__heading h2 { margin: 0; font-size: 1rem; }
.notification-center__heading p { margin: var(--space-1) 0 0; color: var(--color-text-muted); font-size: .75rem; }
.notification-center__close { display: grid; flex: 0 0 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; cursor: pointer; }
.notification-center__close:hover, .notification-center__item-actions button:hover, .notification-center__toolbar button:hover:not(:disabled) { color: var(--color-text); background: var(--color-surface-elevated); }
.notification-center__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); font-size: .75rem; }
.notification-center__toolbar button { min-height: 2.75rem; padding: 0 var(--space-2); border-radius: var(--radius-sm); color: var(--color-primary-strong); background: transparent; font-size: .75rem; cursor: pointer; }
.notification-center__toolbar button:disabled { opacity: .5; cursor: default; }
.notification-center__list { overflow-y: auto; min-height: 0; }
.notification-center__empty { margin: 0; padding: var(--space-5); color: var(--color-text-muted); font-size: .8125rem; }
.notification-center__item { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }
.notification-center__item--unread { background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)); }
.notification-center__item-heading { display: flex; justify-content: space-between; gap: var(--space-2); font-size: .8125rem; }
.notification-center__item-heading strong { min-width: 0; overflow-wrap: anywhere; }
.notification-center__item-heading span { flex: 0 0 auto; color: var(--color-text-muted); font-size: .6875rem; }
.notification-center__item p { margin: var(--space-1) 0; color: var(--color-text-muted); font-size: .75rem; line-height: 1.5; overflow-wrap: anywhere; }
.notification-center__item time { color: var(--color-text-subtle); font-size: .6875rem; }
.notification-center__item-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
.notification-center__item-actions button { min-height: 2.75rem; padding: 0 var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; font-size: .75rem; cursor: pointer; }
.notification-center__footnote { margin: 0; padding: var(--space-2) var(--space-4); color: var(--color-text-subtle); font-size: .6875rem; }
@media (max-width: 30rem) { .notification-center { right: var(--space-3); width: calc(100vw - 1.5rem); } }
</style>
