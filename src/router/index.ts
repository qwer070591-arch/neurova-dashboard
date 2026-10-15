import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/overview',
    },
    {
      path: '/overview',
      name: 'overview',
      component: () => import('../views/OverviewView.vue'),
      meta: { title: '總覽', phase: '第 2 階段' },
    },
    {
      path: '/model-analytics',
      name: 'model-analytics',
      component: () => import('../views/ModelAnalyticsView.vue'),
      meta: { title: '模型分析', phase: '第 3 階段' },
    },
    {
      path: '/usage-billing',
      name: 'usage-billing',
      component: () => import('../views/BillingView.vue'),
      meta: { title: '使用量與費用', phase: '第 3 階段' },
    },
    {
      path: '/activity-logs',
      name: 'activity-logs',
      component: () => import('../views/ActivityLogsView.vue'),
      meta: { title: '活動紀錄', phase: '第 4 階段' },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { title: '使用者管理', phase: '第 4 階段' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '系統設定', phase: '第 4 階段' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/overview',
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? '總覽')} | NEUROVA`
})

export default router
