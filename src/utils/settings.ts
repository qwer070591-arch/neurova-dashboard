import type { DemoNotification, NotificationCategory } from './header'

export const SETTINGS_STORAGE_KEY = 'neurova:settings:v1'
export const DEFAULT_DISPLAY_NAME = '示範管理員'

export interface SettingsPreferences {
  displayName: string
  notifications: Record<NotificationCategory, boolean>
  reducedMotion: boolean
}

export const defaultSettings = (): SettingsPreferences => ({
  displayName: DEFAULT_DISPLAY_NAME,
  notifications: { usage: true, analytics: true },
  reducedMotion: false,
})

export function validateDisplayName(value: string): { value: string; error: string | null } {
  const normalized = value.trim()
  if (!normalized) return { value: normalized, error: '請輸入顯示名稱。' }
  if ([...normalized].length > 40) return { value: normalized, error: '顯示名稱不可超過 40 個字元。' }
  return { value: normalized, error: null }
}

export function isSettingsPreferences(value: unknown): value is SettingsPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const notifications = candidate.notifications
  return typeof candidate.displayName === 'string'
    && !validateDisplayName(candidate.displayName).error
    && candidate.displayName === candidate.displayName.trim()
    && typeof candidate.reducedMotion === 'boolean'
    && Boolean(notifications)
    && typeof notifications === 'object'
    && !Array.isArray(notifications)
    && typeof (notifications as Record<string, unknown>).usage === 'boolean'
    && typeof (notifications as Record<string, unknown>).analytics === 'boolean'
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | null): { preferences: SettingsPreferences; status: 'available' | 'recovered' | 'unavailable' } {
  if (!storage) return { preferences: defaultSettings(), status: 'unavailable' }
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    if (raw === null) return { preferences: defaultSettings(), status: 'available' }
    const value: unknown = JSON.parse(raw)
    if (!isSettingsPreferences(value)) return { preferences: defaultSettings(), status: 'recovered' }
    return { preferences: { displayName: value.displayName, notifications: { ...value.notifications }, reducedMotion: value.reducedMotion }, status: 'available' }
  } catch {
    return { preferences: defaultSettings(), status: 'recovered' }
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'> | null, preferences: SettingsPreferences): boolean {
  if (!storage) return false
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}

export function filterVisibleNotifications(notifications: readonly DemoNotification[], preferences: SettingsPreferences['notifications']): DemoNotification[] {
  return notifications.filter((notification) => preferences[notification.category])
}

export function countUnreadNotifications(notifications: readonly DemoNotification[], readIds: readonly string[]): number {
  const read = new Set(readIds)
  return notifications.filter((notification) => !read.has(notification.id)).length
}
