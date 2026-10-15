<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUiStore } from '../../stores/ui'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const uiStore = useUiStore()
let desktopMediaQuery: MediaQueryList | undefined

function reconcileMobileNavigation(event: MediaQueryListEvent | MediaQueryList) {
  if (event.matches) uiStore.closeMobileNavigation()
}

onMounted(() => {
  uiStore.initialize()
  desktopMediaQuery = window.matchMedia('(min-width: 64.0625rem)')
  reconcileMobileNavigation(desktopMediaQuery)
  desktopMediaQuery.addEventListener('change', reconcileMobileNavigation)
})

onBeforeUnmount(() => {
  desktopMediaQuery?.removeEventListener('change', reconcileMobileNavigation)
  uiStore.dispose()
})
</script>

<template>
  <a class="skip-link" href="#main-content" :inert="uiStore.mobileNavigationOpen">跳至主要內容</a>
  <div class="app-shell" :class="{ 'app-shell--collapsed': uiStore.sidebarCollapsed }">
    <AppSidebar />
    <div class="app-shell__workspace" :inert="uiStore.mobileNavigationOpen">
      <AppHeader />
      <main id="main-content" class="app-shell__main" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  background: var(--gradient-orbit), var(--color-app);
}

.app-shell__workspace {
  min-width: 0;
  min-height: 100dvh;
  padding-left: var(--sidebar-width);
  transition: padding-left var(--motion-base) var(--ease-standard);
}

.app-shell--collapsed .app-shell__workspace {
  padding-left: var(--sidebar-collapsed-width);
}

.app-shell__main {
  width: min(100%, 118rem);
  margin: 0 auto;
  padding: clamp(var(--space-5), 3vw, var(--space-10));
}

@media (max-width: 64rem) {
  .app-shell__workspace,
  .app-shell--collapsed .app-shell__workspace {
    padding-left: 0;
  }

  .app-shell__main {
    padding: var(--space-5);
  }
}

@media (max-width: 30rem) {
  .app-shell__main {
    padding: var(--space-4);
  }
}
</style>
