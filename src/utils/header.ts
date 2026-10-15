export interface SearchEntry {
  id: string
  title: string
  description: string
  path: string
  kind: '頁面' | '常用入口'
  keywords: string
}

// This is a navigation index, not an index of analytics or user data.
export const searchEntries: SearchEntry[] = [
  { id: 'overview', title: '總覽', description: '查看 KPI、使用量分析與最近活動', path: '/overview', kind: '頁面', keywords: 'dashboard overview 儀表板' },
  { id: 'models', title: '模型分析', description: '比較模型、查看使用趨勢', path: '/model-analytics', kind: '頁面', keywords: 'model analytics 模型比較' },
  { id: 'billing', title: '使用量與費用', description: '查看 Token、預估費用與每日明細', path: '/usage-billing', kind: '頁面', keywords: 'usage billing 成本' },
  { id: 'logs', title: '活動紀錄', description: '搜尋及篩選示範請求事件', path: '/activity-logs', kind: '頁面', keywords: 'activity logs 請求紀錄' },
  { id: 'users', title: '使用者管理', description: '管理此瀏覽器的示範使用者', path: '/users', kind: '頁面', keywords: 'users 使用者列表' },
  { id: 'settings', title: '系統設定', description: '前往系統設定頁面', path: '/settings', kind: '頁面', keywords: 'settings 偏好' },
  { id: 'usage-chart', title: '使用量分析', description: '前往總覽的使用量趨勢', path: '/overview', kind: '常用入口', keywords: 'chart 趨勢' },
  { id: 'model-comparison', title: '模型比較', description: '前往模型分析比較表', path: '/model-analytics', kind: '常用入口', keywords: '模型排序' },
  { id: 'daily-usage', title: '每日使用明細', description: '前往使用量與費用明細', path: '/usage-billing', kind: '常用入口', keywords: 'csv 匯出' },
  { id: 'activity-filter', title: '活動搜尋與篩選', description: '前往活動紀錄', path: '/activity-logs', kind: '常用入口', keywords: '事件' },
]

export function filterSearchEntries(query: string): SearchEntry[] {
  const term = query.trim().toLocaleLowerCase('zh-TW')
  if (!term) return searchEntries.filter((entry) => entry.kind === '頁面')
  return searchEntries.filter((entry) =>
    `${entry.title} ${entry.description} ${entry.keywords}`.toLocaleLowerCase('zh-TW').includes(term),
  )
}

export type NotificationCategory = 'usage' | 'analytics'

export interface DemoNotification {
  id: string
  category: NotificationCategory
  title: string
  description: string
  time: string
  path: string
}

export const demoNotifications: DemoNotification[] = [
  { id: 'usage', category: 'usage', title: '使用量摘要可供查看', description: '查看示範資料中的 Token 使用量與預估費用。', time: '2026/10/14', path: '/usage-billing' },
  { id: 'models', category: 'analytics', title: '模型比較資料已備妥', description: '比較各模型的請求數、成功率與延遲。', time: '2026/10/13', path: '/model-analytics' },
  { id: 'activity', category: 'analytics', title: '活動紀錄示範資料', description: '可透過搜尋與篩選查看示範請求事件。', time: '2026/10/12', path: '/activity-logs' },
]

export const notificationStorageKey = 'neurova-demo-notifications-read-v1'

export function loadReadNotificationIds(storage?: Pick<Storage, 'getItem'>): string[] {
  try {
    const parsed: unknown = JSON.parse((storage ?? window.localStorage).getItem(notificationStorageKey) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const known = new Set(demoNotifications.map((notification) => notification.id))
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && known.has(id)))]
  } catch {
    return []
  }
}

export function saveReadNotificationIds(ids: string[], storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? window.localStorage).setItem(notificationStorageKey, JSON.stringify(ids))
    return true
  } catch {
    return false
  }
}
