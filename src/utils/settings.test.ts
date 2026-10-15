import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldAnimateCharts } from '../composables/useChartMotion'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { demoNotifications, notificationStorageKey } from './header'
import { countUnreadNotifications, defaultSettings, filterVisibleNotifications, loadSettings, SETTINGS_STORAGE_KEY, validateDisplayName } from './settings'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

let storage: Storage
let systemDark = false
let systemListener: ((event: MediaQueryListEvent) => void) | null
const html = { dataset: {} as Record<string, string> }

beforeEach(() => {
  storage = memoryStorage()
  systemDark = false
  systemListener = null
  html.dataset = {}
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('document', { documentElement: html })
  vi.stubGlobal('window', {
    localStorage: storage,
    matchMedia: () => ({
      get matches() { return systemDark },
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => { systemListener = listener },
      removeEventListener: () => { systemListener = null },
    }),
  })
  setActivePinia(createPinia())
})
afterEach(() => vi.unstubAllGlobals())

describe('system settings validation and persistence', () => {
  it('disables chart animation when either motion preference requests it', () => {
    expect(shouldAnimateCharts(false, false)).toBe(true)
    expect(shouldAnimateCharts(true, false)).toBe(false)
    expect(shouldAnimateCharts(false, true)).toBe(false)
    expect(shouldAnimateCharts(true, true)).toBe(false)
  })

  it('normalizes the display name and rejects empty or excessive values', () => {
    expect(validateDisplayName('  林管理員  ')).toEqual({ value: '林管理員', error: null })
    expect(validateDisplayName('   ').error).toBeTruthy()
    expect(validateDisplayName('字'.repeat(41)).error).toBeTruthy()
  })

  it('recovers defaults from corrupt or malformed storage', () => {
    storage.setItem(SETTINGS_STORAGE_KEY, '{broken')
    expect(loadSettings(storage)).toEqual({ preferences: defaultSettings(), status: 'recovered' })
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ displayName: '正常', notifications: { usage: 'yes' }, reducedMotion: false }))
    expect(loadSettings(storage).status).toBe('recovered')
  })

  it('saves preferences, filters notification categories, and retains read ids when re-enabled', () => {
    const settings = useSettingsStore()
    expect(settings.saveDisplayName('  新名稱  ')).toEqual({ error: null, saved: true })
    expect(settings.displayName).toBe('新名稱')
    settings.markRead('usage')
    expect(settings.unreadCount).toBe(2)
    settings.setNotificationEnabled('usage', false)
    expect(settings.visibleNotifications.map((item) => item.id)).toEqual(['models', 'activity'])
    expect(settings.unreadCount).toBe(2)
    expect(settings.readIds).toContain('usage')
    settings.setNotificationEnabled('usage', true)
    expect(settings.unreadCount).toBe(2)
    settings.markAllVisibleRead()
    expect(settings.unreadCount).toBe(0)
    expect(storage.getItem(notificationStorageKey)).toContain('usage')
    expect(loadSettings(storage).preferences.displayName).toBe('新名稱')
    setActivePinia(createPinia())
    expect(useSettingsStore().notificationPreferences.usage).toBe(true)
    expect(useSettingsStore().readIds).toHaveLength(3)
  })

  it('clears read state separately, reduces motion, and resets only settings', () => {
    const settings = useSettingsStore()
    settings.saveDisplayName('另一位管理員')
    settings.markRead('usage')
    settings.setNotificationEnabled('analytics', false)
    settings.setReducedMotion(true)
    expect(html.dataset.reducedMotion).toBe('true')
    expect(settings.clearNotificationReadState()).toBe(true)
    expect(settings.readIds).toEqual([])
    expect(settings.notificationPreferences.analytics).toBe(false)
    settings.markRead('usage')
    expect(settings.resetSettings()).toBe(true)
    expect(settings.displayName).toBe(defaultSettings().displayName)
    expect(settings.notificationPreferences.analytics).toBe(true)
    expect(settings.reducedMotion).toBe(false)
    expect(html.dataset.reducedMotion).toBe('false')
    expect(settings.readIds).toEqual(['usage'])
  })

  it('counts only displayed unread notifications', () => {
    const shown = filterVisibleNotifications(demoNotifications, { usage: false, analytics: true })
    expect(shown).toHaveLength(2)
    expect(countUnreadNotifications(shown, ['models'])).toBe(1)
  })
})

describe('shared theme preference', () => {
  it('keeps effective theme in sync with system preference and header toggle', () => {
    const ui = useUiStore()
    ui.initialize()
    expect(ui.theme).toBe('dark')
    ui.setThemePreference('system')
    expect(ui.theme).toBe('light')
    expect(html.dataset.theme).toBe('light')
    systemDark = true
    systemListener?.({ matches: true } as MediaQueryListEvent)
    expect(ui.theme).toBe('dark')
    expect(html.dataset.theme).toBe('dark')
    ui.toggleTheme()
    expect(ui.themePreference).toBe('light')
    expect(ui.theme).toBe('light')
    expect(JSON.parse(storage.getItem('neurova-ui-preferences') ?? '{}').themePreference).toBe('light')
    ui.dispose()
    expect(systemListener).toBeNull()
  })
})
