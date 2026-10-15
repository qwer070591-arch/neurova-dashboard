import { createDefaultUsers } from '../mocks/users'
import type { DemoUser, UserFilters, UserFormErrors, UserFormValues, UserKpis, UserRole, UserSortDirection, UserSortKey, UserStatus } from '../types/users'

export const USER_STORAGE_KEY = 'neurova:user-management:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface StoredUsersResult {
  users: DemoUser[]
  status: 'available' | 'recovered' | 'unavailable'
}

const roles: readonly UserRole[] = ['admin', 'editor', 'viewer']
const statuses: readonly UserStatus[] = ['active', 'inactive']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getUserKpis(users: readonly DemoUser[]): UserKpis {
  return {
    total: users.length,
    active: users.filter((user) => user.status === 'active').length,
    inactive: users.filter((user) => user.status === 'inactive').length,
    admins: users.filter((user) => user.role === 'admin').length,
  }
}

export function filterUsers(users: readonly DemoUser[], filters: UserFilters): DemoUser[] {
  const query = filters.query.trim().toLocaleLowerCase('zh-TW')
  return users.filter((user) => {
    const matchesQuery = !query || user.name.toLocaleLowerCase('zh-TW').includes(query) || user.email.toLocaleLowerCase('zh-TW').includes(query)
    return matchesQuery && (filters.role === 'all' || user.role === filters.role) && (filters.status === 'all' || user.status === filters.status)
  })
}

export function sortUsers(users: readonly DemoUser[], key: UserSortKey, direction: UserSortDirection): DemoUser[] {
  const sign = direction === 'ascending' ? 1 : -1
  return [...users].sort((first, second) => {
    const compared = key === 'name'
      ? first.name.localeCompare(second.name, 'zh-Hant-TW')
      : first.createdAt.localeCompare(second.createdAt)
    return compared * sign
  })
}

export function paginateUsers<T>(items: readonly T[], requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const firstItem = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, items.length)
  return { page, totalPages, firstItem, lastItem, items: items.slice(firstItem - 1, lastItem) }
}

export function validateUserForm(values: UserFormValues, users: readonly DemoUser[], editingId?: string): { values: UserFormValues; errors: UserFormErrors } {
  const normalized: UserFormValues = {
    name: values.name.trim(),
    email: values.email.trim().toLocaleLowerCase('en-US'),
    role: values.role,
    status: values.status,
  }
  const errors: UserFormErrors = {}
  if (normalized.name.length < 2 || normalized.name.length > 60) errors.name = '姓名需介於 2 到 60 個字元。'
  if (!normalized.email) errors.email = '請輸入電子郵件。'
  else if (!emailPattern.test(normalized.email)) errors.email = '請輸入有效的電子郵件格式。'
  else if (users.some((user) => user.id !== editingId && user.email.toLocaleLowerCase('en-US') === normalized.email)) errors.email = '此電子郵件已存在。'
  return { values: normalized, errors }
}

export function isValidDemoUser(value: unknown): value is DemoUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return typeof user.id === 'string'
    && typeof user.name === 'string'
    && typeof user.email === 'string'
    && roles.includes(user.role as UserRole)
    && statuses.includes(user.status as UserStatus)
    && typeof user.createdAt === 'string'
    && !Number.isNaN(Date.parse(user.createdAt))
    && (user.lastActiveAt === null || (typeof user.lastActiveAt === 'string' && !Number.isNaN(Date.parse(user.lastActiveAt))))
}

export function loadStoredUsers(storage: StorageLike | null | undefined): StoredUsersResult {
  if (!storage) return { users: createDefaultUsers(), status: 'unavailable' }
  try {
    const raw = storage.getItem(USER_STORAGE_KEY)
    if (!raw) return { users: createDefaultUsers(), status: 'available' }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isValidDemoUser) || new Set(parsed.map((user) => user.id)).size !== parsed.length) {
      return { users: createDefaultUsers(), status: 'recovered' }
    }
    return { users: parsed.map((user) => ({ ...user })), status: 'available' }
  } catch {
    return { users: createDefaultUsers(), status: 'recovered' }
  }
}

export function saveStoredUsers(storage: StorageLike | null | undefined, users: readonly DemoUser[]) {
  if (!storage) return false
  try {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(users))
    return true
  } catch {
    return false
  }
}

export function resetStoredUsers(storage: StorageLike | null | undefined) {
  const users = createDefaultUsers()
  return { users, saved: saveStoredUsers(storage, users) }
}

export function getRoleLabel(role: UserRole) {
  return role === 'admin' ? '管理員' : role === 'editor' ? '編輯者' : '檢視者'
}

export function getStatusLabel(status: UserStatus) {
  return status === 'active' ? '啟用' : '停用'
}

export function formatUserDate(value: string | null) {
  if (!value) return '尚無活動紀錄'
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)).replace(/-/g, '/')
}

export function formatUserDateTime(value: string | null) {
  if (!value) return '尚無活動紀錄'
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replace(/-/g, '/')
}
