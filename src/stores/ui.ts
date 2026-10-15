import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type AppTheme = 'dark' | 'light'
export type ThemePreference = AppTheme | 'system'

interface PersistedUiPreferences {
  sidebarCollapsed?: boolean
  themePreference?: ThemePreference
}

const storageKey = 'neurova-ui-preferences'

function loadPreferences(): PersistedUiPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!value || typeof value !== 'object') return {}

    const preferences = value as Record<string, unknown>
    return {
      sidebarCollapsed: typeof preferences.sidebarCollapsed === 'boolean' ? preferences.sidebarCollapsed : undefined,
      themePreference: preferences.themePreference === 'light' || preferences.themePreference === 'dark' || preferences.themePreference === 'system'
        ? preferences.themePreference
        : preferences.theme === 'light' || preferences.theme === 'dark' ? preferences.theme : undefined,
    }
  } catch {
    return {}
  }
}

export const useUiStore = defineStore('ui', () => {
  const preferences = loadPreferences()
  const themePreference = ref<ThemePreference>(preferences.themePreference ?? 'dark')
  const systemDark = ref(false)
  const theme = computed<AppTheme>(() => themePreference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : themePreference.value)
  const sidebarCollapsed = ref(preferences.sidebarCollapsed ?? false)
  const mobileNavigationOpen = ref(false)
  const profileMenuOpen = ref(false)
  let systemThemeQuery: MediaQueryList | null = null

  const themeLabel = computed(() => (theme.value === 'dark' ? '切換為淺色模式' : '切換為深色模式'))

  function persistPreferences() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ themePreference: themePreference.value, sidebarCollapsed: sidebarCollapsed.value }))
      return true
    } catch {
      return false
    }
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value
  }

  function initialize() {
    if (!systemThemeQuery) {
      systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = systemThemeQuery.matches
      systemThemeQuery.addEventListener('change', onSystemThemeChange)
    }
    applyTheme()
  }

  function onSystemThemeChange(event: MediaQueryListEvent) {
    systemDark.value = event.matches
    if (themePreference.value === 'system') applyTheme()
  }

  function dispose() {
    systemThemeQuery?.removeEventListener('change', onSystemThemeChange)
    systemThemeQuery = null
  }

  function setThemePreference(value: ThemePreference) {
    themePreference.value = value
    applyTheme()
    return persistPreferences()
  }

  function toggleTheme() {
    return setThemePreference(theme.value === 'dark' ? 'light' : 'dark')
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openMobileNavigation() {
    mobileNavigationOpen.value = true
    profileMenuOpen.value = false
  }

  function closeMobileNavigation() {
    mobileNavigationOpen.value = false
  }

  function toggleProfileMenu() {
    profileMenuOpen.value = !profileMenuOpen.value
  }

  function closeProfileMenu() {
    profileMenuOpen.value = false
  }

  watch(sidebarCollapsed, persistPreferences)

  return {
    theme,
    themePreference,
    sidebarCollapsed,
    mobileNavigationOpen,
    profileMenuOpen,
    themeLabel,
    initialize,
    dispose,
    setThemePreference,
    toggleTheme,
    toggleSidebar,
    openMobileNavigation,
    closeMobileNavigation,
    toggleProfileMenu,
    closeProfileMenu,
  }
})
