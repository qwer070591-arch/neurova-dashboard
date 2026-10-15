import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDefaultUsers } from '../mocks/users'
import { useUsersStore } from '../stores/users'
import type { DemoUser, UserFormValues } from '../types/users'
import { filterUsers, getUserKpis, loadStoredUsers, paginateUsers, resetStoredUsers, saveStoredUsers, sortUsers, USER_STORAGE_KEY, validateUserForm } from './users'

const validForm: UserFormValues = { name: '測試使用者', email: 'test.user@neurova.demo', role: 'viewer', status: 'active' }

function createMemoryStorage(initial?: string) {
  const values = new Map<string, string>()
  if (initial) values.set(USER_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('user management utilities', () => {
  it('creates fixed, reproducible mock users', () => {
    const first = createDefaultUsers()
    const second = createDefaultUsers()
    expect(first).toEqual(second)
    expect(first).toHaveLength(72)
    expect(new Set(first.map((user) => user.id)).size).toBe(first.length)
    expect(new Set(first.map((user) => user.email.toLocaleLowerCase())).size).toBe(first.length)
  })

  it('derives KPI totals from all users rather than active list filters', () => {
    const users = createDefaultUsers()
    const kpis = getUserKpis(users)
    expect(kpis.total).toBe(72)
    expect(kpis.active + kpis.inactive).toBe(kpis.total)
    expect(kpis.admins).toBe(users.filter((user) => user.role === 'admin').length)
  })

  it('filters names and emails, then applies role and status before pagination', () => {
    const users = createDefaultUsers()
    const byName = filterUsers(users, { query: '林雨璇', role: 'all', status: 'all' })
    const byEmail = filterUsers(users, { query: 'yuxuan', role: 'all', status: 'all' })
    const admins = filterUsers(users, { query: '', role: 'admin', status: 'active' })
    expect(byName.length).toBeGreaterThan(0)
    expect(byEmail.length).toBe(byName.length)
    expect(admins.every((user) => user.role === 'admin' && user.status === 'active')).toBe(true)
    const paged = paginateUsers(sortUsers(users, 'createdAt', 'descending'), 99, 10)
    expect(paged.page).toBe(paged.totalPages)
    expect(paged.items.length).toBeLessThanOrEqual(10)
    expect(paginateUsers([], 3, 20)).toMatchObject({ page: 1, totalPages: 1, firstItem: 0, lastItem: 0, items: [] })
  })

  it('sorts names and created dates deterministically', () => {
    const users = createDefaultUsers()
    const byName = sortUsers(users, 'name', 'ascending')
    const byNewest = sortUsers(users, 'createdAt', 'descending')
    expect(byName[0]?.name.localeCompare(byName[1]?.name ?? '', 'zh-Hant-TW')).toBeLessThanOrEqual(0)
    expect(byNewest[0]?.createdAt >= byNewest[1]?.createdAt).toBe(true)
  })

  it('normalizes forms and prevents duplicate emails without blocking the edited user', () => {
    const users = createDefaultUsers()
    const duplicate = validateUserForm({ ...validForm, name: '  新使用者  ', email: ` ${users[0]!.email.toUpperCase()} ` }, users)
    const selfEdit = validateUserForm({ ...validForm, email: users[0]!.email }, users, users[0]!.id)
    const invalid = validateUserForm({ ...validForm, name: ' ', email: 'not-an-email' }, users)
    expect(duplicate.values.name).toBe('新使用者')
    expect(duplicate.errors.email).toContain('已存在')
    expect(selfEdit.errors).toEqual({})
    expect(invalid.errors.name).toBeDefined()
    expect(invalid.errors.email).toBeDefined()
  })

  it('safely recovers default data from invalid storage and resets demo data', () => {
    const malformed = loadStoredUsers(createMemoryStorage('{bad json'))
    const invalidShape = loadStoredUsers(createMemoryStorage(JSON.stringify([{ id: 'missing-fields' }])))
    const storage = createMemoryStorage()
    const reset = resetStoredUsers(storage)
    expect(malformed.status).toBe('recovered')
    expect(invalidShape.status).toBe('recovered')
    expect(reset.saved).toBe(true)
    expect(loadStoredUsers(storage)).toMatchObject({ status: 'available', users: reset.users })
    expect(saveStoredUsers(null, reset.users)).toBe(false)
  })
})

describe('users Pinia store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('updates CRUD state and KPI source data in memory', () => {
    const store = useUsersStore()
    const initialCount = store.users.length
    const added = store.addUser(validForm)
    expect(added.errors).toEqual({})
    expect(added.user).not.toBeNull()
    expect(store.users).toHaveLength(initialCount + 1)
    const addedUser = added.user as DemoUser
    const edited = store.updateUser(addedUser.id, { ...validForm, name: '已編輯使用者', role: 'editor', status: 'inactive' })
    expect(edited.user).toMatchObject({ name: '已編輯使用者', role: 'editor', status: 'inactive' })
    expect(store.setUserStatus(addedUser.id, 'active')).toMatchObject({ status: 'active' })
    expect(store.removeUser(addedUser.id)).toMatchObject({ id: addedUser.id })
    expect(store.users).toHaveLength(initialCount)
    store.resetDemoData()
    expect(store.users).toEqual(createDefaultUsers())
  })
})
