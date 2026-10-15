import type { DemoUser, UserRole, UserStatus } from '../types/users'

const NAMES = [
  '林雨璇', '陳柏宇', '張雅婷', '黃冠霖', '吳思妤', '李承翰', '蔡宜蓁', '王昱翔',
  '劉品妤', '許哲維', '楊子晴', '鄭宇辰', '謝欣穎', '郭冠廷', '周映彤', '蘇柏安',
  '曾婉瑜', '何冠儀', '潘奕安', '羅怡君', '葉承恩', '高語彤', '朱祐維', '梁品蓉',
]

const EMAIL_PREFIXES = [
  'yuxuan', 'boyu', 'yating', 'guanlin', 'siyu', 'chenghan', 'yizhen', 'yuxiang',
  'pinyu', 'zhewei', 'ziqing', 'yuchen', 'xinying', 'guanting', 'yingtong', 'boan',
  'wanyu', 'guanyi', 'yian', 'yijun', 'chengen', 'yutong', 'youwei', 'pinrong',
]

function dateAt(dayOffset: number, hour: number, minute: number) {
  return new Date(Date.UTC(2026, 9, 14 - dayOffset, hour, minute)).toISOString()
}

function createDemoUser(index: number): DemoUser {
  const sourceIndex = index % NAMES.length
  const role: UserRole = index % 12 === 0 ? 'admin' : index % 3 === 0 ? 'editor' : 'viewer'
  const status: UserStatus = index % 9 === 0 || index % 17 === 0 ? 'inactive' : 'active'
  const createdDaysAgo = (71 - index) * 7 + (index % 5)
  const hasRecentActivity = status === 'active' && index % 7 !== 0

  return {
    id: `demo-user-${String(index + 1).padStart(3, '0')}`,
    name: NAMES[sourceIndex]!,
    email: `${EMAIL_PREFIXES[sourceIndex]!}.${String(Math.floor(index / NAMES.length) + 1).padStart(2, '0')}@neurova.demo`,
    role,
    status,
    createdAt: dateAt(createdDaysAgo, 2 + (index % 18), (index * 7) % 60),
    lastActiveAt: hasRecentActivity ? dateAt(Math.min(createdDaysAgo, (index * 5) % 135), 3 + (index % 16), (index * 11) % 60) : null,
  }
}

const DEFAULT_USERS = Array.from({ length: 72 }, (_, index) => createDemoUser(index))

export function createDefaultUsers(): DemoUser[] {
  return DEFAULT_USERS.map((user) => ({ ...user }))
}
