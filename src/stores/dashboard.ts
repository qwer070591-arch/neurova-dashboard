import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { MOCK_REQUESTS } from '../mocks/analytics'
import type { TimeRange } from '../types/analytics'
import { getActivityLogStatistics, getDashboardStatistics, getModelAnalyticsStatistics, getUsageBillingStatistics } from '../utils/analytics'

export const useDashboardStore = defineStore('dashboard', () => {
  const selectedRange = ref<TimeRange>('30d')
  const requests = shallowRef(MOCK_REQUESTS)
  const statistics = computed(() => getDashboardStatistics(requests.value, selectedRange.value))
  const modelAnalytics = computed(() => getModelAnalyticsStatistics(requests.value, selectedRange.value))
  const usageBilling = computed(() => getUsageBillingStatistics(requests.value, selectedRange.value))
  const activityLogs = computed(() => getActivityLogStatistics(requests.value, selectedRange.value))

  function setRange(range: TimeRange) {
    selectedRange.value = range
  }

  return {
    selectedRange,
    statistics,
    modelAnalytics,
    usageBilling,
    activityLogs,
    setRange,
  }
})
