<script setup lang="ts">
import { Bell, ChevronDown, Command, Moon, Search, Sun } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '../../stores/ui'
import { useSettingsStore } from '../../stores/settings'
import GlobalSearchDialog from './GlobalSearchDialog.vue'
import NotificationCenter from './NotificationCenter.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()
const searchTrigger = ref<HTMLButtonElement | null>(null)
const notificationTrigger = ref<HTMLButtonElement | null>(null)
const notificationArea = ref<HTMLElement | null>(null)
const profileArea = ref<HTMLElement | null>(null)
const searchOpen = ref(false)
const notificationsOpen = ref(false)
const unreadCount = computed(() => settingsStore.unreadCount)

const pageTitle = computed(() => String(route.meta.title ?? '總覽'))

function openSearch() {
  notificationsOpen.value = false
  uiStore.closeProfileMenu()
  uiStore.closeMobileNavigation()
  searchOpen.value = true
}

function closeSearch(restoreFocus = true) {
  searchOpen.value = false
  if (restoreFocus) nextTick(() => searchTrigger.value?.focus())
}

function toggleNotifications() {
  searchOpen.value = false
  uiStore.closeProfileMenu()
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) nextTick(() => notificationArea.value?.querySelector<HTMLButtonElement>('.notification-center__close')?.focus())
}

function closeNotifications(restoreFocus = true) {
  notificationsOpen.value = false
  if (restoreFocus) nextTick(() => notificationTrigger.value?.focus())
}

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  } else if (event.key === 'Escape' && notificationsOpen.value) {
    event.preventDefault()
    closeNotifications()
  }
}

function markRead(id: string) {
  settingsStore.markRead(id)
}

function markAllRead() {
  settingsStore.markAllVisibleRead()
}

async function navigate(path: string, notificationId?: string) {
  if (notificationId) markRead(notificationId)
  closeSearch(false)
  closeNotifications(false)
  await router.push(path)
  await nextTick()
  document.querySelector<HTMLElement>('#main-content')?.focus()
}

function closeProfileWhenClickingAway(event: MouseEvent) {
  if (profileArea.value && !profileArea.value.contains(event.target as Node)) {
    uiStore.closeProfileMenu()
  }
}

function closeNotificationsWhenClickingAway(event: PointerEvent) {
  if (notificationsOpen.value && notificationArea.value && !notificationArea.value.contains(event.target as Node)) {
    closeNotifications(false)
  }
}

watch(() => route.path, () => {
  searchOpen.value = false
  notificationsOpen.value = false
})

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('click', closeProfileWhenClickingAway)
  window.addEventListener('pointerdown', closeNotificationsWhenClickingAway)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('click', closeProfileWhenClickingAway)
  window.removeEventListener('pointerdown', closeNotificationsWhenClickingAway)
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__breadcrumb" aria-label="目前位置">
      <span>NEUROVA</span>
      <ChevronDown :size="14" class="app-header__breadcrumb-icon" aria-hidden="true" />
      <strong>{{ pageTitle }}</strong>
    </div>

    <div class="app-header__actions">
      <button ref="searchTrigger" class="app-header__search" type="button" aria-label="開啟全站搜尋" aria-haspopup="dialog" :aria-expanded="searchOpen" aria-controls="global-search-dialog" @click="openSearch">
        <Search :size="17" aria-hidden="true" />
        <span>全站搜尋</span>
        <kbd aria-hidden="true"><Command :size="12" /> K</kbd>
      </button>

      <div ref="notificationArea" class="app-header__notification-area">
        <button ref="notificationTrigger" class="app-header__icon-button app-header__notification-trigger" type="button" :aria-label="`通知中心，${unreadCount} 則未讀`" aria-haspopup="dialog" :aria-expanded="notificationsOpen" aria-controls="notification-center" @click="toggleNotifications">
          <Bell :size="19" aria-hidden="true" />
          <span v-if="unreadCount" class="app-header__badge" aria-hidden="true">{{ unreadCount }}</span>
        </button>
        <NotificationCenter v-if="notificationsOpen" :notifications="settingsStore.visibleNotifications" :read-ids="settingsStore.readIds" @close="closeNotifications()" @read="markRead" @read-all="markAllRead" @navigate="navigate" />
      </div>
      <button class="app-header__icon-button" type="button" :aria-label="uiStore.themeLabel" @click="uiStore.toggleTheme">
        <Sun v-if="uiStore.theme === 'dark'" :size="19" aria-hidden="true" />
        <Moon v-else :size="19" aria-hidden="true" />
      </button>

      <div ref="profileArea" class="app-header__profile">
        <button
          class="app-header__profile-trigger"
          type="button"
          :aria-expanded="uiStore.profileMenuOpen"
          aria-haspopup="menu"
          @click="uiStore.toggleProfileMenu"
        >
          <span class="app-header__avatar" aria-hidden="true">NV</span>
          <span class="app-header__profile-copy">
            <strong>{{ settingsStore.displayName }}</strong>
            <small>工作區擁有者</small>
          </span>
          <ChevronDown :size="15" aria-hidden="true" />
        </button>
        <Transition name="profile-menu">
          <div v-if="uiStore.profileMenuOpen" class="app-header__profile-menu" role="menu">
            <p>NEUROVA 工作區</p>
            <button type="button" role="menuitem" disabled>示範工作區不提供真實帳號或團隊設定</button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
  <GlobalSearchDialog v-if="searchOpen" @close="closeSearch()" @navigate="navigate" />
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: 10;
  top: 0;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: var(--header-height);
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 clamp(var(--space-5), 3vw, var(--space-10));
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
  background: color-mix(in srgb, var(--color-app) 82%, transparent);
  backdrop-filter: blur(16px);
}

.app-header__breadcrumb,
.app-header__actions,
.app-header__profile-trigger,
.app-header__search {
  display: flex;
  align-items: center;
}

.app-header__breadcrumb {
  flex: 1 1 0;
  min-width: 0;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.app-header__breadcrumb strong {
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__breadcrumb-icon {
  transform: rotate(-90deg);
}

.app-header__actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--space-2);
}

.app-header__search {
  width: clamp(10rem, 18vw, 16rem);
  min-height: 2.5rem;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-subtle);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.app-header__search:hover,
.app-header__search:focus-visible {
  border-color: var(--color-primary);
}

.app-header__search span {
  flex: 1;
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.app-header__search kbd {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.125rem 0.3125rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  color: var(--color-text-subtle);
  font-family: inherit;
  font-size: 0.625rem;
  white-space: nowrap;
}

.app-header__icon-button,
.app-header__profile-trigger {
  min-height: 2.5rem;
  color: var(--color-text-muted);
  background: transparent;
  transition: color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard);
}

.app-header__icon-button {
  position: relative;
  display: grid;
  width: 2.5rem;
  place-items: center;
  border-radius: var(--radius-sm);
}

.app-header__notification-area { flex: 0 0 auto; }
.app-header__badge { position: absolute; top: -0.25rem; right: -0.25rem; display: grid; min-width: 1.125rem; height: 1.125rem; place-items: center; padding: 0 .2rem; border-radius: 999px; color: #fff; background: var(--color-primary-action); font-size: .625rem; font-weight: 700; }

.app-header__icon-button:not(:disabled):hover,
.app-header__profile-trigger:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.app-header__icon-button:disabled {
  opacity: 0.48;
}

.app-header__profile {
  position: relative;
  flex: 0 0 auto;
}

.app-header__profile-trigger {
  flex: 0 0 auto;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  text-align: left;
}

.app-header__avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(129 140 248 / 48%);
  border-radius: 50%;
  color: #e0e7ff;
  background: linear-gradient(135deg, var(--color-primary-action), var(--color-secondary-action));
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.app-header__profile-copy {
  display: grid;
  min-width: 0;
  max-width: 9rem;
  line-height: 1.2;
}

.app-header__profile-copy strong {
  overflow: hidden;
  color: var(--color-text);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__profile-copy small {
  color: var(--color-text-subtle);
  font-size: 0.625rem;
}

.app-header__profile-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + var(--space-2));
  right: 0;
  width: 16rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface-elevated);
  box-shadow: var(--shadow-float);
}

.app-header__profile-menu p {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.app-header__profile-menu button {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-subtle);
  background: transparent;
  text-align: left;
  font-size: 0.75rem;
}

.profile-menu-enter-active,
.profile-menu-leave-active {
  transition: opacity var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard);
}

.profile-menu-enter-from,
.profile-menu-leave-to {
  opacity: 0;
  transform: translateY(-0.375rem);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 64rem) {
  .app-header {
    padding-right: var(--space-4);
    padding-left: 4rem;
  }
}

@media (max-width: 44rem) {
  .app-header__search {
    width: 2.5rem;
    justify-content: center;
    padding: 0;
  }

  .app-header__search span,
  .app-header__search kbd,
  .app-header__profile-copy,
  .app-header__profile-trigger > :last-child {
    display: none;
  }
}

@media (max-width: 30rem) {
  .app-header {
    padding-right: var(--space-3);
    padding-left: 4rem;
  }

  .app-header__actions {
    gap: var(--space-1);
  }

  .app-header__breadcrumb > span,
  .app-header__breadcrumb-icon {
    display: none;
  }
}
</style>
