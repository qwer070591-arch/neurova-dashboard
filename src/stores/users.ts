import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DemoUser, UserFormValues, UserStatus } from '../types/users'
import { loadStoredUsers, resetStoredUsers, saveStoredUsers, validateUserForm, type StorageLike } from '../utils/users'

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const useUsersStore = defineStore('users', () => {
  const storage = getBrowserStorage()
  const loaded = loadStoredUsers(storage)
  const users = ref<DemoUser[]>(loaded.users)
  const persistenceStatus = ref(loaded.status)
  const totalUsers = computed(() => users.value.length)

  function persist() {
    if (saveStoredUsers(storage, users.value)) persistenceStatus.value = 'available'
    else persistenceStatus.value = 'unavailable'
  }

  function addUser(values: UserFormValues) {
    const result = validateUserForm(values, users.value)
    if (Object.keys(result.errors).length) return { user: null, errors: result.errors }
    const user: DemoUser = {
      id: `demo-user-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...result.values,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
    }
    users.value = [user, ...users.value]
    persist()
    return { user, errors: {} }
  }

  function updateUser(id: string, values: UserFormValues) {
    const result = validateUserForm(values, users.value, id)
    if (Object.keys(result.errors).length) return { user: null, errors: result.errors }
    const current = users.value.find((user) => user.id === id)
    if (!current) return { user: null, errors: { name: '找不到此示範使用者。' } }
    const updated: DemoUser = { ...current, ...result.values }
    users.value = users.value.map((user) => user.id === id ? updated : user)
    persist()
    return { user: updated, errors: {} }
  }

  function setUserStatus(id: string, status: UserStatus) {
    const current = users.value.find((user) => user.id === id)
    if (!current) return null
    const updated = { ...current, status }
    users.value = users.value.map((user) => user.id === id ? updated : user)
    persist()
    return updated
  }

  function removeUser(id: string) {
    const current = users.value.find((user) => user.id === id)
    if (!current) return null
    users.value = users.value.filter((user) => user.id !== id)
    persist()
    return current
  }

  function resetDemoData() {
    const reset = resetStoredUsers(storage)
    users.value = reset.users
    persistenceStatus.value = reset.saved ? 'available' : 'unavailable'
  }

  function replaceUsersForTesting(nextUsers: DemoUser[]) {
    users.value = nextUsers.map((user) => ({ ...user }))
  }

  return { users, totalUsers, persistenceStatus, addUser, updateUser, setUserStatus, removeUser, resetDemoData, replaceUsersForTesting }
})
