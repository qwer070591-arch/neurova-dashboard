<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Power, Trash2 } from '@lucide/vue'
import type { DemoUser, UserSortDirection, UserSortKey } from '../../types/users'
import { formatUserDate, formatUserDateTime, getRoleLabel, getStatusLabel } from '../../utils/users'

defineProps<{
  users: readonly DemoUser[]
  sortKey: UserSortKey
  sortDirection: UserSortDirection
}>()

const emit = defineEmits<{
  sort: [key: UserSortKey]
  edit: [user: DemoUser, trigger: HTMLButtonElement]
  status: [user: DemoUser, trigger: HTMLButtonElement]
  remove: [user: DemoUser, trigger: HTMLButtonElement]
}>()

function sortIcon(key: UserSortKey, activeKey: UserSortKey, direction: UserSortDirection) {
  return key !== activeKey ? ArrowUpDown : direction === 'ascending' ? ArrowUp : ArrowDown
}
</script>

<template>
  <div class="users-table-wrap" data-testid="users-table-wrap">
    <table class="users-table" data-testid="users-table">
      <thead>
        <tr>
          <th scope="col"><button type="button" @click="emit('sort', 'name')">使用者 <component :is="sortIcon('name', sortKey, sortDirection)" :size="14" aria-hidden="true" /></button></th>
          <th scope="col">電子郵件</th>
          <th scope="col">角色</th>
          <th scope="col">帳號狀態</th>
          <th scope="col"><button type="button" @click="emit('sort', 'createdAt')">加入日期 <component :is="sortIcon('createdAt', sortKey, sortDirection)" :size="14" aria-hidden="true" /></button></th>
          <th scope="col">最後活動時間</th>
          <th scope="col"><span class="sr-only">操作</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <th scope="row"><strong>{{ user.name }}</strong><small>{{ user.id }}</small></th>
          <td class="users-table__email">{{ user.email }}</td>
          <td><span class="users-badge users-badge--role">{{ getRoleLabel(user.role) }}</span></td>
          <td><span class="users-badge" :class="`users-badge--${user.status}`">{{ getStatusLabel(user.status) }}</span></td>
          <td>{{ formatUserDate(user.createdAt) }}</td>
          <td>{{ formatUserDateTime(user.lastActiveAt) }}</td>
          <td><div class="users-actions"><button type="button" :data-testid="`edit-user-${user.id}`" :aria-label="`編輯 ${user.name}`" @click="emit('edit', user, $event.currentTarget as HTMLButtonElement)"><Pencil :size="15" aria-hidden="true" />編輯</button><button type="button" :data-testid="`toggle-user-${user.id}`" :aria-label="`${user.status === 'active' ? '停用' : '啟用'} ${user.name}`" @click="emit('status', user, $event.currentTarget as HTMLButtonElement)"><Power :size="15" aria-hidden="true" />{{ user.status === 'active' ? '停用' : '啟用' }}</button><button type="button" class="users-actions__danger" :data-testid="`delete-user-${user.id}`" :aria-label="`刪除 ${user.name}`" @click="emit('remove', user, $event.currentTarget as HTMLButtonElement)"><Trash2 :size="15" aria-hidden="true" />刪除</button></div></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="users-cards" data-testid="users-cards">
    <article v-for="user in users" :key="user.id" class="user-card">
      <header><div><h3>{{ user.name }}</h3><p>{{ user.email }}</p></div><span class="users-badge" :class="`users-badge--${user.status}`">{{ getStatusLabel(user.status) }}</span></header>
      <dl><div><dt>角色</dt><dd><span class="users-badge users-badge--role">{{ getRoleLabel(user.role) }}</span></dd></div><div><dt>加入日期</dt><dd>{{ formatUserDate(user.createdAt) }}</dd></div><div><dt>最後活動時間</dt><dd>{{ formatUserDateTime(user.lastActiveAt) }}</dd></div></dl>
      <footer class="users-actions"><button type="button" :data-testid="`edit-user-mobile-${user.id}`" @click="emit('edit', user, $event.currentTarget as HTMLButtonElement)"><Pencil :size="15" aria-hidden="true" />編輯</button><button type="button" :data-testid="`toggle-user-mobile-${user.id}`" @click="emit('status', user, $event.currentTarget as HTMLButtonElement)"><Power :size="15" aria-hidden="true" />{{ user.status === 'active' ? '停用' : '啟用' }}</button><button type="button" class="users-actions__danger" :data-testid="`delete-user-mobile-${user.id}`" @click="emit('remove', user, $event.currentTarget as HTMLButtonElement)"><Trash2 :size="15" aria-hidden="true" />刪除</button></footer>
    </article>
  </div>
</template>

<style scoped>
.users-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }.users-table { width: 100%; min-width: 60rem; border-collapse: collapse; color: var(--color-text-muted); font-size: 0.75rem; }.users-table th, .users-table td { padding: var(--space-4); border-bottom: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent); text-align: left; vertical-align: middle; white-space: nowrap; }.users-table thead th { color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; }.users-table thead button { display: inline-flex; align-items: center; gap: var(--space-1); color: inherit; background: transparent; font: inherit; font-weight: inherit; }.users-table tbody tr:last-child > * { border-bottom: 0; }.users-table tbody tr:hover { background: color-mix(in srgb, var(--color-primary) 4%, transparent); }.users-table tbody th strong { display: block; color: var(--color-text); font-size: 0.8125rem; }.users-table tbody th small { display: block; max-width: 11rem; margin-top: var(--space-1); overflow: hidden; color: var(--color-text-subtle); font-size: 0.625rem; text-overflow: ellipsis; }.users-table__email { max-width: 15rem; overflow: hidden; text-overflow: ellipsis; }.users-badge { display: inline-flex; min-height: 1.625rem; align-items: center; padding: 0 var(--space-2); border: 1px solid transparent; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; white-space: nowrap; }.users-badge--role { border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 10%, transparent); }.users-badge--active { border-color: color-mix(in srgb, var(--color-success) 35%, var(--color-border)); color: var(--color-success-text); background: color-mix(in srgb, var(--color-success) 9%, transparent); }.users-badge--inactive { border-color: color-mix(in srgb, var(--color-text-subtle) 45%, var(--color-border)); color: var(--color-text-muted); background: color-mix(in srgb, var(--color-text-subtle) 8%, transparent); }.users-actions { display: flex; align-items: center; gap: var(--space-2); }.users-actions button { display: inline-flex; min-height: 2.5rem; align-items: center; justify-content: center; gap: var(--space-1); padding: 0 var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); background: var(--color-surface); font-size: 0.6875rem; font-weight: 700; }.users-actions button:hover { color: var(--color-text); border-color: var(--color-border-strong); background: var(--color-surface-elevated); }.users-actions .users-actions__danger { color: var(--color-error-text); border-color: color-mix(in srgb, var(--color-error) 42%, var(--color-border)); }.users-cards { display: none; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.users-table-wrap { min-width: 0; max-width: 100%; }
@media (max-width: 48rem) { .users-table-wrap { display: none; }.users-cards { display: grid; gap: var(--space-3); }.user-card { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }.user-card header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); }.user-card h3 { margin: 0; color: var(--color-text); font-size: 0.9375rem; }.user-card header p { margin: var(--space-1) 0 0; overflow-wrap: anywhere; color: var(--color-text-muted); font-size: 0.75rem; }.user-card dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }.user-card dl > div:last-child { grid-column: 1 / -1; }.user-card dt { color: var(--color-text-subtle); font-size: 0.6875rem; }.user-card dd { margin: var(--space-1) 0 0; overflow-wrap: anywhere; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; }.users-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }.users-actions button { min-width: 0; min-height: 2.75rem; padding: 0 var(--space-1); font-size: 0.6875rem; } }
</style>
