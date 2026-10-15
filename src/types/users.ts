export type UserRole = 'admin' | 'editor' | 'viewer'
export type UserStatus = 'active' | 'inactive'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastActiveAt: string | null
}

export interface UserFormValues {
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

export type UserFormErrors = Partial<Record<'name' | 'email', string>>

export interface UserFilters {
  query: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
}

export type UserSortKey = 'name' | 'createdAt'
export type UserSortDirection = 'ascending' | 'descending'

export interface UserKpis {
  total: number
  active: number
  inactive: number
  admins: number
}
