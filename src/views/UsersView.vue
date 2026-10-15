<script setup lang="ts">
import { Plus, RotateCcw, Search, ShieldCheck, UserCheck, UserRound, UserX, Users } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import MobileFilterSelect from '../components/activity-logs/MobileFilterSelect.vue'
import UserConfirmDialog from '../components/users/UserConfirmDialog.vue'
import UserFormDialog from '../components/users/UserFormDialog.vue'
import UsersTable from '../components/users/UsersTable.vue'
import MobileSortControls from '../components/ui/MobileSortControls.vue'
import PageScaffold from '../components/ui/PageScaffold.vue'
import { useUsersStore } from '../stores/users'
import type { DemoUser, UserFormValues, UserRole, UserSortDirection, UserSortKey, UserStatus } from '../types/users'
import { restoreDialogFocus } from '../utils/dialogFocus'
import { filterUsers, getUserKpis, paginateUsers, sortUsers } from '../utils/users'

type PageSize = 10 | 20 | 50
type ConfirmAction = { type: 'status' | 'delete'; user: DemoUser } | { type: 'reset' }

const usersStore = useUsersStore()
const pageSize = ref<PageSize>(10)
const currentPage = ref(1)
const sortKey = ref<UserSortKey>('createdAt')
const sortDirection = ref<UserSortDirection>('descending')
const selectedUser = ref<DemoUser | null>(null)
const formMode = ref<'create' | 'edit' | null>(null)
const confirmAction = ref<ConfirmAction | null>(null)
const dialogReturnFocus = ref<HTMLButtonElement | null>(null)
const toast = ref<{ message: string; tone: 'success' | 'error' } | null>(null)
const filters = reactive<{ query: string; role: UserRole | 'all'; status: UserStatus | 'all' }>({ query: '', role: 'all', status: 'all' })
let toastTimer: ReturnType<typeof window.setTimeout> | undefined

const roleOptions = [{ value: 'all', label: '全部角色' }, { value: 'admin', label: '管理員' }, { value: 'editor', label: '編輯者' }, { value: 'viewer', label: '檢視者' }]
const statusOptions = [{ value: 'all', label: '全部狀態' }, { value: 'active', label: '啟用' }, { value: 'inactive', label: '停用' }]
const userSortOptions = [{ value: 'name', label: '使用者名稱' }, { value: 'createdAt', label: '加入日期' }]
const kpis = computed(() => getUserKpis(usersStore.users))
const filteredUsers = computed(() => filterUsers(usersStore.users, filters))
const sortedUsers = computed(() => sortUsers(filteredUsers.value, sortKey.value, sortDirection.value))
const pagination = computed(() => paginateUsers(sortedUsers.value, currentPage.value, pageSize.value))
const hasFilters = computed(() => Boolean(filters.query || filters.role !== 'all' || filters.status !== 'all'))
const pageSummary = computed(() => pagination.value.firstItem === 0 ? '暫無符合條件的使用者' : `顯示第 ${pagination.value.firstItem}–${pagination.value.lastItem} 筆，共 ${sortedUsers.value.length} 筆`)
const confirmationTitle = computed(() => { if (!confirmAction.value) return ''; if (confirmAction.value.type === 'reset') return '重設示範資料？'; if (confirmAction.value.type === 'delete') return `刪除「${confirmAction.value.user.name}」？`; return `${confirmAction.value.user.status === 'active' ? '停用' : '啟用'}「${confirmAction.value.user.name}」？` })
const confirmationDescription = computed(() => { if (!confirmAction.value) return ''; if (confirmAction.value.type === 'reset') return '目前瀏覽器中對示範使用者做的新增、編輯、狀態與刪除變更都會被還原。這不會影響任何真實帳號。'; if (confirmAction.value.type === 'delete') return `「${confirmAction.value.user.name}」(${confirmAction.value.user.email}) 將從此瀏覽器的示範資料列表移除。這不是刪除真實帳號。`; return `即將${confirmAction.value.user.status === 'active' ? '停用' : '啟用'}「${confirmAction.value.user.name}」(${confirmAction.value.user.email}) 的示範帳號狀態，不會影響真實服務。` })
const confirmationLabel = computed(() => confirmAction.value?.type === 'delete' ? '確認刪除' : confirmAction.value?.type === 'reset' ? '重設資料' : confirmAction.value?.user.status === 'active' ? '確認停用' : '確認啟用')

watch([() => filters.query, () => filters.role, () => filters.status, pageSize, sortKey, sortDirection], () => { currentPage.value = 1 })
watch(() => pagination.value.page, (page) => { if (currentPage.value !== page) currentPage.value = page })
onBeforeUnmount(() => { if (toastTimer) window.clearTimeout(toastTimer) })

function notify(message: string, tone: 'success' | 'error' = 'success') { toast.value = { message, tone }; if (toastTimer) window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.value = null }, 4_000) }
function setRoleFilter(value: string) { filters.role = value as typeof filters.role }
function setStatusFilter(value: string) { filters.status = value as typeof filters.status }
function setPageSize(event: Event) { pageSize.value = Number((event.target as HTMLSelectElement).value) as PageSize }
function clearFilters() { filters.query = ''; filters.role = 'all'; filters.status = 'all' }
function previousPage() { currentPage.value = Math.max(1, currentPage.value - 1) }
function nextPage() { currentPage.value = Math.min(pagination.value.totalPages, currentPage.value + 1) }
function toggleSort(key: UserSortKey) { if (sortKey.value === key) sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending'; else { sortKey.value = key; sortDirection.value = key === 'name' ? 'ascending' : 'descending' } }
function selectMobileSort(value: string) { if (value !== sortKey.value && userSortOptions.some((option) => option.value === value)) toggleSort(value as UserSortKey) }
function openCreate(trigger: HTMLButtonElement) { dialogReturnFocus.value = trigger; selectedUser.value = null; formMode.value = 'create' }
function openEdit(user: DemoUser, trigger: HTMLButtonElement) { dialogReturnFocus.value = trigger; selectedUser.value = user; formMode.value = 'edit' }
function closeForm() { formMode.value = null; selectedUser.value = null; void nextTick(() => restoreDialogFocus(dialogReturnFocus.value)) }
function submitForm(values: UserFormValues) {
  const editing = formMode.value === 'edit'
  const result = editing && selectedUser.value ? usersStore.updateUser(selectedUser.value.id, values) : usersStore.addUser(values)
  if (!result.user) { notify('表單資料尚未完成，請檢查欄位內容。', 'error'); return }
  currentPage.value = 1
  const visible = filteredUsers.value.some((user) => user.id === result.user?.id)
  closeForm()
  notify(visible ? `已${editing ? '更新' : '新增'}「${result.user.name}」。` : `已儲存「${result.user.name}」，但目前篩選條件不會顯示此使用者。`)
}
function openStatusConfirmation(user: DemoUser, trigger: HTMLButtonElement) { dialogReturnFocus.value = trigger; confirmAction.value = { type: 'status', user } }
function openDeleteConfirmation(user: DemoUser, trigger: HTMLButtonElement) { dialogReturnFocus.value = trigger; confirmAction.value = { type: 'delete', user } }
function openResetConfirmation(trigger: HTMLButtonElement) { dialogReturnFocus.value = trigger; confirmAction.value = { type: 'reset' } }
function closeConfirmation() { confirmAction.value = null; void nextTick(() => restoreDialogFocus(dialogReturnFocus.value)) }
function confirmActionNow() {
  const action = confirmAction.value
  if (!action) return
  if (action.type === 'reset') { usersStore.resetDemoData(); currentPage.value = 1; notify('已重設本瀏覽器的示範使用者資料。') }
  if (action.type === 'delete') { usersStore.removeUser(action.user.id); notify(`已從示範列表移除「${action.user.name}」。`) }
  if (action.type === 'status') { const updated = usersStore.setUserStatus(action.user.id, action.user.status === 'active' ? 'inactive' : 'active'); if (updated) notify(`已${updated.status === 'active' ? '啟用' : '停用'}「${updated.name}」。`) }
  closeConfirmation()
}
</script>

<template>
  <PageScaffold title="使用者管理" summary="管理此瀏覽器中的示範使用者資料；不涉及真實帳號、登入或服務權限。" phase="Phase 6">
    <template #header-actions><button type="button" class="users-create" data-testid="open-create-user" @click="openCreate($event.currentTarget as HTMLButtonElement)"><Plus :size="17" aria-hidden="true" />新增使用者</button></template>
    <div class="users-page">
      <aside v-if="usersStore.persistenceStatus !== 'available'" class="users-storage-warning" role="alert" data-testid="users-storage-warning"><strong>{{ usersStore.persistenceStatus === 'recovered' ? '已安全回復示範資料' : '目前無法使用瀏覽器儲存空間' }}</strong><span>{{ usersStore.persistenceStatus === 'recovered' ? '偵測到無效或損壞的資料，已載入固定的預設示範資料。' : '本次變更仍可在記憶體中操作，但重新整理後不會保留。' }}</span></aside>
      <section class="users-kpis" aria-label="整體使用者統計"><article data-testid="users-kpi-total"><span><Users :size="18" aria-hidden="true" /></span><p>使用者總數</p><strong>{{ kpis.total }}</strong><small>全部示範使用者</small></article><article data-testid="users-kpi-active"><span><UserCheck :size="18" aria-hidden="true" /></span><p>啟用中使用者</p><strong>{{ kpis.active }}</strong><small>不受列表篩選影響</small></article><article data-testid="users-kpi-inactive"><span><UserX :size="18" aria-hidden="true" /></span><p>停用中使用者</p><strong>{{ kpis.inactive }}</strong><small>不受列表篩選影響</small></article><article data-testid="users-kpi-admins"><span><ShieldCheck :size="18" aria-hidden="true" /></span><p>管理員人數</p><strong>{{ kpis.admins }}</strong><small>不受列表篩選影響</small></article></section>
      <section class="users-panel" aria-labelledby="users-list-title"><header class="users-panel__header"><div><p>本機示範資料</p><h2 id="users-list-title">使用者列表</h2><small>變更只儲存在此瀏覽器，不含密碼、Token 或真實帳號資料。</small></div><button type="button" class="users-reset" data-testid="reset-demo-users" @click="openResetConfirmation($event.currentTarget as HTMLButtonElement)"><RotateCcw :size="16" aria-hidden="true" />重設示範資料</button></header>
        <div class="users-filters" aria-label="使用者篩選器"><label class="users-filter users-filter--search"><span>姓名或 Email</span><Search :size="16" aria-hidden="true" /><input v-model="filters.query" data-testid="users-search" type="search" placeholder="搜尋姓名或 Email" /></label><div class="users-filter"><span id="users-role-filter-label">角色</span><select v-model="filters.role" class="users-filter__native" data-testid="users-role-filter"><option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><MobileFilterSelect :model-value="filters.role" :options="roleOptions" label-id="users-role-filter-label" id="users-role-filter" test-id="users-role-filter" @update:model-value="setRoleFilter" /></div><div class="users-filter"><span id="users-status-filter-label">帳號狀態</span><select v-model="filters.status" class="users-filter__native" data-testid="users-status-filter"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><MobileFilterSelect :model-value="filters.status" :options="statusOptions" label-id="users-status-filter-label" id="users-status-filter" test-id="users-status-filter" @update:model-value="setStatusFilter" /></div><button v-if="hasFilters" type="button" class="users-clear" data-testid="clear-user-filters" @click="clearFilters"><RotateCcw :size="16" aria-hidden="true" />清除篩選</button></div>
        <template v-if="sortedUsers.length"><div class="users-toolbar"><p data-testid="users-pagination-summary" aria-live="polite">{{ pageSummary }}</p><label for="users-page-size">每頁顯示<select id="users-page-size" data-testid="users-page-size" :value="pageSize" @change="setPageSize"><option :value="10">10 筆</option><option :value="20">20 筆</option><option :value="50">50 筆</option></select></label></div><MobileSortControls id="users-list" :model-value="sortKey" :options="userSortOptions" :direction="sortDirection" @update:model-value="selectMobileSort" @toggle-direction="toggleSort(sortKey)" /><UsersTable :users="pagination.items" :sort-key="sortKey" :sort-direction="sortDirection" @sort="toggleSort" @edit="openEdit" @status="openStatusConfirmation" @remove="openDeleteConfirmation" /><nav v-if="sortedUsers.length > pageSize" class="users-pagination" aria-label="使用者分頁"><button type="button" data-testid="users-page-previous" :disabled="pagination.page === 1" @click="previousPage">上一頁</button><span data-testid="users-page-current" aria-live="polite">第 {{ pagination.page }} 頁，共 {{ pagination.totalPages }} 頁</span><button type="button" data-testid="users-page-next" :disabled="pagination.page === pagination.totalPages" @click="nextPage">下一頁</button></nav></template>
        <div v-else class="users-empty" data-testid="users-empty"><UserRound :size="28" aria-hidden="true" /><strong>暫無符合條件的使用者</strong><span>請調整搜尋或篩選條件後再試一次。</span><button v-if="hasFilters" type="button" @click="clearFilters">清除篩選</button></div>
      </section>
    </div>
    <div v-if="toast" class="users-toast" :class="`users-toast--${toast.tone}`" role="status" data-testid="users-toast">{{ toast.message }}</div>
    <UserFormDialog v-if="formMode" :key="selectedUser?.id ?? 'create'" :user="selectedUser ?? undefined" :users="usersStore.users" @close="closeForm" @submit="submitForm" />
    <UserConfirmDialog v-if="confirmAction" :title="confirmationTitle" :description="confirmationDescription" :confirm-label="confirmationLabel" :tone="confirmAction.type === 'delete' ? 'danger' : 'warning'" @close="closeConfirmation" @confirm="confirmActionNow" />
  </PageScaffold>
</template>

<style scoped>
.users-page { display: grid; gap: clamp(var(--space-6), 2.5vw, var(--space-8)); }.users-create, .users-reset, .users-clear { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: 0 var(--space-3); border-radius: var(--radius-md); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.users-create { color: #fff; background: var(--color-primary-action); }.users-reset, .users-clear { border: 1px solid var(--color-border); color: var(--color-text-muted); background: var(--color-surface); }.users-storage-warning { display: grid; gap: var(--space-1); padding: var(--space-4); border: 1px solid color-mix(in srgb, var(--color-warning) 48%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-text-muted); background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface)); font-size: 0.75rem; }.users-storage-warning strong { color: var(--color-warning-text); }.users-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }.users-kpis article, .users-panel { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-surface); }.users-kpis article { padding: var(--space-5); }.users-kpis article > span { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--color-border)); border-radius: var(--radius-md); color: var(--color-primary-strong); background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-elevated)); }.users-kpis article:nth-child(2) > span { color: var(--color-success-text); border-color: color-mix(in srgb, var(--color-success) 34%, var(--color-border)); background: color-mix(in srgb, var(--color-success) 10%, var(--color-surface-elevated)); }.users-kpis article:nth-child(3) > span { color: var(--color-warning-text); border-color: color-mix(in srgb, var(--color-warning) 34%, var(--color-border)); background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-elevated)); }.users-kpis article p { margin: var(--space-5) 0 0; color: var(--color-text-muted); font-size: 0.8125rem; font-weight: 600; }.users-kpis article strong { display: block; margin-top: var(--space-2); color: var(--color-text); font-size: clamp(1.5rem, 2.2vw, 2.15rem); font-variant-numeric: tabular-nums; letter-spacing: -0.04em; line-height: 1.1; }.users-kpis article small { display: block; margin-top: var(--space-3); color: var(--color-text-subtle); font-size: 0.6875rem; }.users-panel { padding: var(--space-5); }.users-panel__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }.users-panel__header p { margin: 0 0 var(--space-1); color: var(--color-secondary-text); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; }.users-panel h2 { margin: 0; font-size: 1.0625rem; }.users-panel__header small { display: block; max-width: 42rem; margin-top: var(--space-2); color: var(--color-text-subtle); font-size: 0.75rem; }.users-filters { display: grid; grid-template-columns: minmax(14rem, 1.5fr) repeat(2, minmax(8rem, 1fr)) auto; align-items: end; gap: var(--space-3); padding: var(--space-4); border: 1px solid color-mix(in srgb, var(--color-border) 78%, transparent); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface-elevated) 55%, transparent); }.users-filter { display: grid; min-width: 0; gap: var(--space-1); color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; }.users-filter--search { position: relative; }.users-filter--search svg { position: absolute; bottom: 0.875rem; left: var(--space-3); color: var(--color-text-subtle); pointer-events: none; }.users-filter input, .users-filter select, .users-toolbar select { width: 100%; min-height: 2.75rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font: inherit; }.users-filter input { min-width: 0; padding: 0 var(--space-3) 0 2.5rem; }.users-filter select, .users-toolbar select { padding: 0 var(--space-7) 0 var(--space-3); }.users-filter :deep(.mobile-filter-select) { display: none; }.users-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin: var(--space-5) 0 var(--space-4); }.users-toolbar p { margin: 0; color: var(--color-text-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; }.users-toolbar label { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }.users-toolbar select { width: auto; min-width: 4.5rem; }.users-pagination { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }.users-pagination button, .users-empty button { min-height: 2.75rem; padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); font-size: 0.75rem; font-weight: 700; }.users-pagination button:disabled { cursor: not-allowed; opacity: 0.45; }.users-pagination span { min-width: 7.5rem; color: var(--color-text-muted); font-size: 0.75rem; text-align: center; font-variant-numeric: tabular-nums; }.users-empty { display: grid; min-height: 16rem; place-content: center; justify-items: center; gap: var(--space-2); color: var(--color-text-muted); text-align: center; }.users-empty strong { color: var(--color-text); }.users-empty span { font-size: 0.8125rem; }.users-toast { position: fixed; z-index: 90; right: var(--space-5); bottom: var(--space-5); max-width: min(24rem, calc(100vw - var(--space-8))); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); font-size: 0.8125rem; font-weight: 700; }.users-toast--success { border-color: color-mix(in srgb, var(--color-success) 52%, var(--color-border)); }.users-toast--error { border-color: color-mix(in srgb, var(--color-error) 52%, var(--color-border)); }
@media (max-width: 75rem) { .users-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }.users-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }.users-filter--search { grid-column: 1 / -1; }.users-clear { justify-self: start; } }
@media (max-width: 40rem) { .users-kpis { grid-template-columns: 1fr; }.users-kpis article, .users-panel { padding: var(--space-4); }.users-panel__header { flex-direction: column; gap: var(--space-3); }.users-reset { align-self: flex-start; }.users-filters { grid-template-columns: 1fr; padding: var(--space-3); }.users-filter--search { grid-column: auto; }.users-filter .users-filter__native { display: none; }.users-filter :deep(.mobile-filter-select) { display: block; }.users-clear { width: 100%; }.users-toolbar { align-items: stretch; flex-direction: column; }.users-toolbar label { width: 100%; justify-content: space-between; white-space: normal; }.users-toolbar select { width: 4.5rem; }.users-pagination { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: var(--space-2); }.users-pagination button { min-width: 0; padding: 0 var(--space-2); }.users-pagination span { min-width: 0; font-size: 0.6875rem; }.users-toast { right: var(--space-4); bottom: var(--space-4); } }
</style>
