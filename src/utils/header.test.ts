import { describe, expect, it, vi } from 'vitest'
import { demoNotifications, filterSearchEntries, loadReadNotificationIds, notificationStorageKey, saveReadNotificationIds } from './header'

describe('header navigation search', () => {
  it('shows all six pages for an empty query', () => {
    expect(filterSearchEntries('')).toHaveLength(6)
    expect(filterSearchEntries(' ').map((entry) => entry.path)).toContain('/settings')
  })

  it('finds page names and existing feature entries without indexing data', () => {
    expect(filterSearchEntries('模型比較').map((entry) => entry.path)).toContain('/model-analytics')
    expect(filterSearchEntries('CSV').map((entry) => entry.path)).toContain('/usage-billing')
    expect(filterSearchEntries('不存在的資料內容')).toEqual([])
  })
})

describe('demo notification read persistence', () => {
  it('accepts only known, unique notification ids', () => {
    const storage = { getItem: () => JSON.stringify(['usage', 'usage', 'unknown', 42]) }
    expect(loadReadNotificationIds(storage)).toEqual(['usage'])
    expect(demoNotifications).toHaveLength(3)
  })

  it('recovers from corrupted or inaccessible storage', () => {
    expect(loadReadNotificationIds({ getItem: () => '{bad' })).toEqual([])
    expect(loadReadNotificationIds({ getItem: () => { throw new Error('blocked') } })).toEqual([])
    expect(saveReadNotificationIds(['usage'], { setItem: () => { throw new Error('blocked') } })).toBe(false)
  })

  it('writes a separate namespace for read state', () => {
    const setItem = vi.fn()
    expect(saveReadNotificationIds(['usage'], { setItem })).toBe(true)
    expect(setItem).toHaveBeenCalledWith(notificationStorageKey, '["usage"]')
  })
})
