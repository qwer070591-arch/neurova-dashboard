import { describe, expect, it } from 'vitest'
import { DEMO_REFERENCE_DATE, MOCK_REQUESTS } from '../mocks/analytics'
import type { AiRequest } from '../types/analytics'
import { calculateAggregate, calculateRequestCost, createActivityLogsCsv, createActivityLogsCsvFilename, createUsageCsv, createUsageCsvFilename, filterActivityLogs, getActivityLogStatistics, getDashboardStatistics, getModelAnalyticsStatistics, getRequestsForRange, getUsageBillingStatistics, paginateActivityLogs } from './analytics'

describe('analytics utilities', () => {
  it('calculates request cost from input and output model pricing', () => {
    const request: AiRequest = {
      id: 'cost-check',
      modelId: 'reason',
      inputTokens: 1_000_000,
      outputTokens: 2_000_000,
      status: 'success',
      latencyMs: 800,
      timestamp: DEMO_REFERENCE_DATE.toISOString(),
    }

    expect(calculateRequestCost(request)).toBe(108)
  })

  it('keeps token totals, cost, and model usage derived from the same requests', () => {
    const statistics = getDashboardStatistics(MOCK_REQUESTS, '30d')
    const aggregate = calculateAggregate(getRequestsForRange(MOCK_REQUESTS, '30d'))
    const distributedTokens = statistics.modelDistribution.reduce((total, item) => total + item.totalTokens, 0)

    expect(statistics.totalTokens).toBe(statistics.inputTokens + statistics.outputTokens)
    expect(statistics.totalTokens).toBe(aggregate.totalTokens)
    expect(statistics.totalCost).toBeCloseTo(aggregate.totalCost, 8)
    expect(distributedTokens).toBe(statistics.totalTokens)
    expect(statistics.modelDistribution.reduce((total, item) => total + item.percentage, 0)).toBeCloseTo(100, 8)
  })

  it('creates deterministic, complete data for every reporting range', () => {
    const sevenDays = getDashboardStatistics(MOCK_REQUESTS, '7d')
    const thirtyDays = getDashboardStatistics(MOCK_REQUESTS, '30d')
    const year = getDashboardStatistics(MOCK_REQUESTS, '1y')

    expect(sevenDays.usageSeries).toHaveLength(7)
    expect(thirtyDays.usageSeries).toHaveLength(30)
    expect(year.usageSeries).toHaveLength(365)
    expect(sevenDays.totalRequests).toBeLessThan(thirtyDays.totalRequests)
    expect(thirtyDays.totalRequests).toBeLessThan(year.totalRequests)
    expect(sevenDays.recentRequests[0]?.timestamp.slice(0, 10)).toBe(DEMO_REFERENCE_DATE.toISOString().slice(0, 10))
  })

  it('uses the prior matching period as the KPI comparison baseline', () => {
    const current = getDashboardStatistics(MOCK_REQUESTS, '7d')
    const repeat = getDashboardStatistics(MOCK_REQUESTS, '7d')

    expect(current.kpis).toEqual(repeat.kpis)
    expect(current.kpis.every((metric) => Number.isFinite(metric.trendPercent))).toBe(true)
    expect(current.kpis.every((metric) => metric.previousValue >= 0)).toBe(true)
  })

  it('derives model analytics from the same requests and reporting range as the dashboard', () => {
    const dashboard = getDashboardStatistics(MOCK_REQUESTS, '90d')
    const models = getModelAnalyticsStatistics(MOCK_REQUESTS, '90d')

    expect(models.totalRequests).toBe(dashboard.totalRequests)
    expect(models.totalTokens).toBe(dashboard.totalTokens)
    expect(models.totalCost).toBeCloseTo(dashboard.totalCost, 8)
    expect(models.models.reduce((total, model) => total + model.requestCount, 0)).toBe(dashboard.totalRequests)
    expect(models.models.reduce((total, model) => total + model.totalTokens, 0)).toBe(dashboard.totalTokens)
    expect(models.usageSeries).toHaveLength(90)
    expect(models.usageSeries.every((point) => Object.values(point.values).every(Number.isFinite))).toBe(true)
  })

  it('derives usage and cost values from the dashboard statistics without floating-point display drift', () => {
    const dashboard = getDashboardStatistics(MOCK_REQUESTS, '1y')
    const billing = getUsageBillingStatistics(MOCK_REQUESTS, '1y')

    expect(billing.totalTokens).toBe(dashboard.totalTokens)
    expect(billing.totalRequests).toBe(dashboard.totalRequests)
    expect(billing.totalCost).toBeCloseTo(dashboard.totalCost, 8)
    expect(billing.records.reduce((total, record) => total + record.totalTokens, 0)).toBe(dashboard.totalTokens)
    expect(billing.records.reduce((total, record) => total + record.requestCount, 0)).toBe(dashboard.totalRequests)
    expect(billing.modelCosts.reduce((total, model) => total + model.totalCost, 0)).toBeCloseTo(dashboard.totalCost, 8)
    expect(billing.trendSeries).toHaveLength(53)
  })

  it('exports safe UTF-8 BOM CSV content and a range-based filename', () => {
    const billing = getUsageBillingStatistics(MOCK_REQUESTS, '7d')
    const csv = createUsageCsv(billing.records, billing.rangeLabel)
    const csvRows = csv.trim().split(/\r?\n/).filter(Boolean)
    const csvWithFormulaLikeValue = createUsageCsv([
      { ...billing.records[0]!, label: '=SUM(A1:A2)' },
    ], '=unsafe-range')

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csvRows.length - 3).toBe(billing.records.length)
    expect(csv).toContain('示範資料')
    expect(csv).toContain('每日使用彙總示範資料')
    expect(csvWithFormulaLikeValue).toContain("'=unsafe-range")
    expect(csvWithFormulaLikeValue).toContain("'=SUM(A1:A2)")
    expect(createUsageCsvFilename(billing.records)).toMatch(/^neurova-usage-demo-\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('derives deterministic request-event activity statistics from the selected range', () => {
    const activity = getActivityLogStatistics(MOCK_REQUESTS, '30d')
    const aggregate = calculateAggregate(getRequestsForRange(MOCK_REQUESTS, '30d'))

    expect(activity.requestEvents).toBe(aggregate.totalRequests)
    expect(activity.successfulRequests).toBe(aggregate.successfulRequests)
    expect(activity.failedRequests).toBe(activity.entries.filter((entry) => entry.status === 'failed').length)
    expect(activity.successRate).toBeCloseTo(aggregate.successRate, 8)
    expect(activity.entries.every((entry) => entry.eventType === 'request')).toBe(true)
    expect(activity.entries.map((entry) => entry.id)).toEqual([...activity.entries].sort((first, second) => second.timestamp.localeCompare(first.timestamp)).map((entry) => entry.id))
    expect(getActivityLogStatistics(MOCK_REQUESTS, '30d')).toEqual(activity)
  })

  it('filters activity events before pagination and clamps invalid pages', () => {
    const entries = getActivityLogStatistics(MOCK_REQUESTS, '90d').entries
    const model = entries[0]!.model.id
    const matching = filterActivityLogs(entries, { query: 'neurova', modelId: model, status: 'all', eventType: 'request' })
    const empty = filterActivityLogs(entries, { query: 'not-a-real-activity', modelId: 'all', status: 'all', eventType: 'all' })
    const paged = paginateActivityLogs(matching, 99, 10)

    expect(matching.length).toBeGreaterThan(0)
    expect(matching.every((entry) => entry.model.id === model && entry.eventType === 'request')).toBe(true)
    expect(empty).toHaveLength(0)
    expect(paged.page).toBe(paged.totalPages)
    expect(paged.items.length).toBeLessThanOrEqual(10)
    expect(paged.firstItem).toBeGreaterThan(0)
    expect(paginateActivityLogs([], 4, 20)).toMatchObject({ page: 1, totalPages: 1, firstItem: 0, lastItem: 0, items: [] })
  })

  it('exports all filtered activity events as safe UTF-8 BOM CSV data', () => {
    const entries = getActivityLogStatistics(MOCK_REQUESTS, '7d').entries
    const csv = createActivityLogsCsv(entries, 'safe-range')
    const unsafeCsv = createActivityLogsCsv([{ ...entries[0]!, id: '=SUM(A1:A2)', resultSummary: 'line one, "quoted"\nline two' }], '=unsafe-range')

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.trim().split(/\r?\n/).filter(Boolean).length - 3).toBe(entries.length)
    expect(unsafeCsv).toContain("'=unsafe-range")
    expect(unsafeCsv).toContain("'=SUM(A1:A2)")
    expect(unsafeCsv).toContain('"line one, ""quoted""\nline two"')
    expect(createActivityLogsCsvFilename(entries)).toMatch(/^neurova-activity-logs-demo-\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
