<script setup lang="ts">
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  UsersRound,
  X,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { useUiStore } from '../../stores/ui'

const uiStore = useUiStore()
const route = useRoute()
const drawer = ref<HTMLElement | null>(null)
const drawerCloseButton = ref<HTMLButtonElement | null>(null)
const mobileTrigger = ref<HTMLButtonElement | null>(null)
let returnFocusTo: HTMLElement | null = null
let releaseScrollLock: (() => void) | undefined

const navigationItems = [
  { label: '總覽', to: '/overview', icon: LayoutDashboard },
  { label: '模型分析', to: '/model-analytics', icon: BarChart3 },
  { label: '使用量與費用', to: '/usage-billing', icon: CreditCard },
  { label: '活動紀錄', to: '/activity-logs', icon: ScrollText },
  { label: '使用者管理', to: '/users', icon: UsersRound },
  { label: '系統設定', to: '/settings', icon: Settings },
]

const collapseLabel = computed(() => (uiStore.sidebarCollapsed ? '展開側邊欄' : '收合側邊欄'))

function navigate() {
  uiStore.closeMobileNavigation()
}

function openDrawer() {
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : mobileTrigger.value
  uiStore.openMobileNavigation()
}

function drawerFocusables() {
  return Array.from(drawer.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    .filter((element) => element.getClientRects().length > 0)
}

function onDrawerKeydown(event: KeyboardEvent) {
  if (!uiStore.mobileNavigationOpen) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    uiStore.closeMobileNavigation()
    return
  }
  if (event.key !== 'Tab') return

  const focusables = drawerFocusables()
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) {
    event.preventDefault()
    drawer.value?.focus()
  } else if (!drawer.value?.contains(document.activeElement)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function keepFocusInDrawer(event: FocusEvent) {
  if (uiStore.mobileNavigationOpen && !drawer.value?.contains(event.target as Node)) {
    drawerCloseButton.value?.focus()
  }
}

watch(() => uiStore.mobileNavigationOpen, async (open) => {
  if (open) {
    returnFocusTo ??= document.activeElement instanceof HTMLElement ? document.activeElement : mobileTrigger.value
    releaseScrollLock = acquireDocumentScrollLock()
    window.addEventListener('keydown', onDrawerKeydown, true)
    window.addEventListener('focusin', keepFocusInDrawer, true)
    await nextTick()
    if (uiStore.mobileNavigationOpen) drawerCloseButton.value?.focus()
    return
  }

  window.removeEventListener('keydown', onDrawerKeydown, true)
  window.removeEventListener('focusin', keepFocusInDrawer, true)
  releaseScrollLock?.()
  releaseScrollLock = undefined
  await nextTick()
  if (uiStore.mobileNavigationOpen || document.querySelector('[role="dialog"][aria-modal="true"]')) return
  const target = returnFocusTo?.isConnected && returnFocusTo.getClientRects().length ? returnFocusTo : document.querySelector<HTMLElement>('#main-content')
  target?.focus()
  returnFocusTo = null
}, { flush: 'sync' })

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onDrawerKeydown, true)
  window.removeEventListener('focusin', keepFocusInDrawer, true)
  releaseScrollLock?.()
})
</script>

<template>
  <div
    v-if="uiStore.mobileNavigationOpen"
    class="sidebar-overlay"
    aria-hidden="true"
    @click="uiStore.closeMobileNavigation"
  />

  <aside
    ref="drawer"
    class="sidebar"
    :class="{
      'sidebar--collapsed': uiStore.sidebarCollapsed,
      'sidebar--mobile-open': uiStore.mobileNavigationOpen,
    }"
    :role="uiStore.mobileNavigationOpen ? 'dialog' : undefined"
    :aria-modal="uiStore.mobileNavigationOpen ? 'true' : undefined"
    aria-label="主要導覽"
    tabindex="-1"
  >
    <div class="sidebar__top">
      <RouterLink class="sidebar__brand" to="/overview" aria-label="NEUROVA 總覽" @click="navigate">
        <span class="sidebar__mark" aria-hidden="true"><Sparkles :size="20" /></span>
        <span class="sidebar__brand-copy">
          <strong>NEUROVA</strong>
          <small>AI 智慧平台</small>
        </span>
      </RouterLink>
      <button
        ref="drawerCloseButton"
        class="sidebar__close-button"
        type="button"
        aria-label="關閉導覽選單"
        @click="uiStore.closeMobileNavigation"
      >
        <X :size="20" aria-hidden="true" />
      </button>
    </div>

    <nav class="sidebar__nav" aria-label="平台功能">
      <p class="sidebar__section-label">工作區</p>
      <ul class="sidebar__nav-list">
        <li v-for="item in navigationItems" :key="item.to">
          <RouterLink
            class="sidebar__nav-link"
            :class="{ 'sidebar__nav-link--active': route.path === item.to }"
            :to="item.to"
            :aria-current="route.path === item.to ? 'page' : undefined"
            :title="uiStore.sidebarCollapsed ? item.label : undefined"
            @click="navigate"
          >
            <component :is="item.icon" :size="19" stroke-width="1.8" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="sidebar__bottom">
      <div class="sidebar__status" title="平台以示範模式執行中">
        <span class="sidebar__status-dot" aria-hidden="true" />
        <span>示範工作區</span>
      </div>
      <button class="sidebar__collapse-button" type="button" :aria-label="collapseLabel" @click="uiStore.toggleSidebar">
        <ChevronLeft v-if="!uiStore.sidebarCollapsed" :size="18" aria-hidden="true" />
        <ChevronRight v-else :size="18" aria-hidden="true" />
        <span>{{ collapseLabel }}</span>
      </button>
    </div>
  </aside>

  <button ref="mobileTrigger" class="mobile-nav-trigger" type="button" aria-label="開啟導覽選單" :inert="uiStore.mobileNavigationOpen" @click="openDrawer">
    <Menu :size="21" aria-hidden="true" />
  </button>
</template>

<style scoped>
.sidebar {
  position: fixed;
  z-index: 30;
  inset: 0 auto 0 0;
  display: flex;
  width: var(--sidebar-width);
  min-height: 100dvh;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-sidebar) 92%, transparent);
  box-shadow: 12px 0 40px rgb(2 6 23 / 12%);
  backdrop-filter: blur(18px);
  transition: width var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-standard);
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar__top {
  display: flex;
  min-height: 5.25rem;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
}

.sidebar__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
  text-decoration: none;
}

.sidebar__mark {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(129 140 248 / 42%);
  border-radius: 0.8rem;
  color: #eef2ff;
  background: linear-gradient(135deg, var(--color-primary-action), var(--color-secondary-action));
  box-shadow: 0 10px 24px rgb(99 102 241 / 28%);
}

.sidebar__brand-copy {
  display: grid;
  gap: 0.0625rem;
  white-space: nowrap;
  transition: opacity var(--motion-fast) var(--ease-standard);
}

.sidebar__brand-copy strong {
  font-size: 0.875rem;
  line-height: 1;
  letter-spacing: 0.1em;
}

.sidebar__brand-copy small,
.sidebar__section-label,
.sidebar__status {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.sidebar__close-button,
.mobile-nav-trigger {
  display: none;
}

.sidebar__nav {
  flex: 1;
  padding: var(--space-4) var(--space-3);
}

.sidebar__section-label {
  margin: 0 0 var(--space-2);
  padding: 0 var(--space-3);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__nav-list {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar__nav-link,
.sidebar__collapse-button {
  display: flex;
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  overflow: hidden;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard);
}

.sidebar__nav-link:hover,
.sidebar__collapse-button:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.sidebar__nav-link--active {
  color: var(--color-text);
  background: linear-gradient(90deg, rgb(99 102 241 / 24%), rgb(6 182 212 / 8%));
  box-shadow: inset 2px 0 0 var(--color-primary);
}

.sidebar__nav-link span,
.sidebar__collapse-button span {
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.sidebar__bottom {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
}

.sidebar__status {
  display: flex;
  min-height: 1.5rem;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  white-space: nowrap;
}

.sidebar__status-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgb(34 197 94 / 12%);
}

.sidebar__collapse-button {
  border: 1px solid transparent;
  color: var(--color-text-muted);
  background: transparent;
  text-align: left;
}

.sidebar--collapsed .sidebar__top,
.sidebar--collapsed .sidebar__nav,
.sidebar--collapsed .sidebar__bottom {
  padding-right: var(--space-2);
  padding-left: var(--space-2);
}

.sidebar--collapsed .sidebar__brand-copy,
.sidebar--collapsed .sidebar__section-label,
.sidebar--collapsed .sidebar__nav-link span,
.sidebar--collapsed .sidebar__status span,
.sidebar--collapsed .sidebar__collapse-button span {
  display: none;
}

.sidebar--collapsed .sidebar__brand,
.sidebar--collapsed .sidebar__nav-link,
.sidebar--collapsed .sidebar__collapse-button {
  justify-content: center;
  padding-right: var(--space-2);
  padding-left: var(--space-2);
}

.sidebar--collapsed .sidebar__status {
  justify-content: center;
  padding: 0;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 64rem) {
  .sidebar {
    width: min(18rem, 86vw);
    visibility: hidden;
    transform: translateX(-105%);
    box-shadow: var(--shadow-float);
  }

  .sidebar--collapsed {
    width: min(18rem, 86vw);
  }

  .sidebar--mobile-open {
    visibility: visible;
    transform: translateX(0);
  }

  .sidebar__nav {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .sidebar--collapsed .sidebar__top,
  .sidebar--collapsed .sidebar__nav,
  .sidebar--collapsed .sidebar__bottom {
    padding-right: var(--space-3);
    padding-left: var(--space-3);
  }

  .sidebar--collapsed .sidebar__brand-copy,
  .sidebar--collapsed .sidebar__section-label,
  .sidebar--collapsed .sidebar__nav-link span,
  .sidebar--collapsed .sidebar__status span,
  .sidebar--collapsed .sidebar__collapse-button span {
    display: initial;
  }

  .sidebar--collapsed .sidebar__brand,
  .sidebar--collapsed .sidebar__nav-link,
  .sidebar--collapsed .sidebar__collapse-button {
    justify-content: flex-start;
    padding-right: var(--space-3);
    padding-left: var(--space-3);
  }

  .sidebar--collapsed .sidebar__status {
    justify-content: flex-start;
    padding: 0 var(--space-3);
  }

  .sidebar__close-button {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    background: transparent;
  }

  .sidebar__close-button:hover {
    color: var(--color-text);
    background: var(--color-surface-elevated);
  }

  .sidebar-overlay {
    position: fixed;
    z-index: 29;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    background: var(--color-overlay);
  }

  .mobile-nav-trigger {
    position: fixed;
    z-index: 20;
    top: 0.875rem;
    left: 0.875rem;
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    box-shadow: var(--shadow-surface);
    backdrop-filter: blur(12px);
  }
}
</style>
