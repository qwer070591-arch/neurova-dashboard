import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { demoNotifications, loadReadNotificationIds, saveReadNotificationIds, type NotificationCategory } from '../utils/header'
import { countUnreadNotifications, defaultSettings, filterVisibleNotifications, loadSettings, saveSettings, validateDisplayName, type SettingsPreferences } from '../utils/settings'

function browserStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export const useSettingsStore = defineStore('settings', () => {
  const storage = browserStorage()
  const loaded = loadSettings(storage)
  const preferences = ref<SettingsPreferences>(loaded.preferences)
  const persistenceStatus = ref(loaded.status)
  const readIds = ref(loadReadNotificationIds(storage ?? { getItem: () => null }))
  const displayName = computed(() => preferences.value.displayName)
  const notificationPreferences = computed(() => preferences.value.notifications)
  const reducedMotion = computed(() => preferences.value.reducedMotion)
  const visibleNotifications = computed(() => filterVisibleNotifications(demoNotifications, preferences.value.notifications))
  const unreadCount = computed(() => countUnreadNotifications(visibleNotifications.value, readIds.value))

  function applyReducedMotion() {
    document.documentElement.dataset.reducedMotion = String(preferences.value.reducedMotion)
  }

  function initialize() { applyReducedMotion() }

  function persist() {
    const saved = saveSettings(storage, preferences.value)
    persistenceStatus.value = saved ? 'available' : 'unavailable'
    return saved
  }

  function saveDisplayName(value: string) {
    const validation = validateDisplayName(value)
    if (validation.error) return { error: validation.error, saved: false }
    preferences.value = { ...preferences.value, displayName: validation.value }
    return { error: null, saved: persist() }
  }

  function setNotificationEnabled(category: NotificationCategory, enabled: boolean) {
    preferences.value = { ...preferences.value, notifications: { ...preferences.value.notifications, [category]: enabled } }
    return persist()
  }

  function setReducedMotion(enabled: boolean) {
    preferences.value = { ...preferences.value, reducedMotion: enabled }
    applyReducedMotion()
    return persist()
  }

  function markRead(id: string) {
    if (readIds.value.includes(id)) return true
    readIds.value = [...readIds.value, id]
    return saveReadNotificationIds(readIds.value, storage ?? undefined)
  }

  function markAllVisibleRead() {
    readIds.value = [...new Set([...readIds.value, ...visibleNotifications.value.map((notification) => notification.id)])]
    return saveReadNotificationIds(readIds.value, storage ?? undefined)
  }

  function clearNotificationReadState() {
    readIds.value = []
    return saveReadNotificationIds([], storage ?? undefined)
  }

  function resetSettings() {
    preferences.value = defaultSettings()
    applyReducedMotion()
    return persist()
  }

  return {
    preferences, persistenceStatus, readIds, displayName, notificationPreferences, reducedMotion,
    visibleNotifications, unreadCount, initialize, saveDisplayName, setNotificationEnabled,
    setReducedMotion, markRead, markAllVisibleRead, clearNotificationReadState, resetSettings,
  }
})
