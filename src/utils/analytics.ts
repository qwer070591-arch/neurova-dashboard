import { AI_MODELS_BY_ID, DEMO_REFERENCE_DATE } from '../mocks/analytics'
import type {
  AiRequest,
  AiModel,
  ActivityEventType,
  ActivityLogEntry,
  ActivityLogStatistics,
  DashboardStatistics,
  KpiMetric,
  MetricFormat,
  ModelAnalyticsMetric,
  ModelAnalyticsStatistics,
  ModelCostMetric,
  ModelDistributionItem,
  ModelUsagePoint,
  RequestStatus,
  TimeRange,
  UsageBillingRecord,
  UsageBillingStatistics,
  UsageBillingTrendPoint,
  UsagePoint,
} from '../types/analytics'

export const TIME_RANGE_OPTIONS: readonly { value: TimeRange; label: string }[] = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
  { value: '1y', label: '近 1 年' },
] as const

const RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

interface Aggregate {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalRequests: number
  totalCost: number
  successfulRequests: number
  successRate: number
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setUTCHours(0, 0, 0, 0)
  return value
}

function addDays(date: Date, days: number) {
  const value = new Date(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value
}

function formatMonthDay(date: Date) {
  return `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`
}

function dateKey(date: Date | string) {
  return typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function createDateWindow(range: TimeRange, referenceDate = DEMO_REFERENCE_DATE) {
  const end = startOfDay(referenceDate)
  const days = RANGE_DAYS[range]
  const start = addDays(end, -(days - 1))
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(days - 1))

  return { start, end, previousStart, previousEnd, days }
}

function inWindow(timestamp: string, start: Date, end: Date) {
  const value = new Date(timestamp).getTime()
  const endExclusive = addDays(end, 1).getTime()
  return value >= start.getTime() && value < endExclusive
}

export function getRequestsForRange(requests: readonly AiRequest[], range: TimeRange, referenceDate = DEMO_REFERENCE_DATE) {
  const { start, end } = createDateWindow(range, referenceDate)
  return requests.filter((request) => inWindow(request.timestamp, start, end))
}

export function calculateRequestCost(request: AiRequest) {
  const model = AI_MODELS_BY_ID[request.modelId]
  return (request.inputTokens / 1_000_000) * model.pricing.inputPerMillion + (request.outputTokens / 1_000_000) * model.pricing.outputPerMillion
}

export function calculateAggregate(requests: readonly AiRequest[]): Aggregate {
  const aggregate = requests.reduce(
    (result, request) => {
      result.inputTokens += request.inputTokens
      result.outputTokens += request.outputTokens
      result.totalRequests += 1
      result.totalCost += calculateRequestCost(request)
      if (request.status === 'success') result.successfulRequests += 1
      return result
    },
    { inputTokens: 0, outputTokens: 0, totalRequests: 0, totalCost: 0, successfulRequests: 0 },
  )

  return {
    ...aggregate,
    totalTokens: aggregate.inputTokens + aggregate.outputTokens,
    successRate: aggregate.totalRequests === 0 ? 0 : (aggregate.successfulRequests / aggregate.totalRequests) * 100,
  }
}

function createUsageSeries(requests: readonly AiRequest[], start: Date, days: number): UsagePoint[] {
  const groups = new Map<string, AiRequest[]>()
  for (const request of requests) {
    const key = dateKey(request.timestamp)
    const bucket = groups.get(key) ?? []
    bucket.push(request)
    groups.set(key, bucket)
  }

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index)
    const dayRequests = groups.get(dateKey(date)) ?? []
    const aggregate = calculateAggregate(dayRequests)
    return {
      date: dateKey(date),
      label: formatMonthDay(date),
      inputTokens: aggregate.inputTokens,
      outputTokens: aggregate.outputTokens,
      totalTokens: aggregate.totalTokens,
      requests: aggregate.totalRequests,
    }
  })
}

function createModelDistribution(requests: readonly AiRequest[], totalTokens: number): ModelDistributionItem[] {
  return Object.values(AI_MODELS_BY_ID).map((model) => {
    const modelRequests = requests.filter((request) => request.modelId === model.id)
    const modelTokens = modelRequests.reduce((total, request) => total + request.inputTokens + request.outputTokens, 0)

    return {
      model,
      totalTokens: modelTokens,
      requests: modelRequests.length,
      percentage: totalTokens === 0 ? 0 : (modelTokens / totalTokens) * 100,
    }
  })
}

function metricSparkline(series: UsagePoint[], metric: KpiMetric['key'], requests: readonly AiRequest[]) {
  if (metric === 'tokens') return series.map((point) => point.totalTokens)
  if (metric === 'requests') return series.map((point) => point.requests)
  if (metric === 'cost') {
    const costs = new Map<string, number>()
    for (const request of requests) {
      const key = dateKey(request.timestamp)
      costs.set(key, (costs.get(key) ?? 0) + calculateRequestCost(request))
    }
    return series.map((point) => costs.get(point.date) ?? 0)
  }

  const results = new Map<string, { total: number; successful: number }>()
  for (const request of requests) {
    const key = dateKey(request.timestamp)
    const value = results.get(key) ?? { total: 0, successful: 0 }
    value.total += 1
    if (request.status === 'success') value.successful += 1
    results.set(key, value)
  }
  return series.map((point) => {
    const value = results.get(point.date)
    return value && value.total > 0 ? (value.successful / value.total) * 100 : 0
  })
}

function createKpis(current: Aggregate, previous: Aggregate, usageSeries: UsagePoint[], currentRequests: readonly AiRequest[]): KpiMetric[] {
  const definitions: readonly Omit<KpiMetric, 'value' | 'previousValue' | 'trendPercent' | 'sparkline'>[] = [
    {
      key: 'tokens',
      label: 'Token 使用總量',
      comparisonLabel: '較前一期間',
      tooltip: '所選期間使用的輸入與輸出 Token 總和。',
      format: 'tokens',
    },
    {
      key: 'requests',
      label: '請求總數',
      comparisonLabel: '較前一期間',
      tooltip: '所選期間所有成功、失敗與處理中的請求。',
      format: 'number',
    },
    {
      key: 'cost',
      label: '總費用',
      comparisonLabel: '較前一期間',
      tooltip: '依各模型的模擬輸入與輸出定價計算的預估費用。',
      format: 'currency',
    },
    {
      key: 'successRate',
      label: '成功率',
      comparisonLabel: '較前一期間',
      tooltip: '所選期間中狀態為成功的請求比例。',
      format: 'percentage',
    },
  ]

  const values = {
    tokens: [current.totalTokens, previous.totalTokens],
    requests: [current.totalRequests, previous.totalRequests],
    cost: [current.totalCost, previous.totalCost],
    successRate: [current.successRate, previous.successRate],
  } as const

  return definitions.map((definition) => {
    const [value, previousValue] = values[definition.key]
    return {
      ...definition,
      value,
      previousValue,
      trendPercent: percentageChange(value, previousValue),
      sparkline: metricSparkline(usageSeries, definition.key, currentRequests),
    }
  })
}

export function getDashboardStatistics(
  requests: readonly AiRequest[],
  range: TimeRange,
  referenceDate = DEMO_REFERENCE_DATE,
): DashboardStatistics {
  const { start, end, previousStart, previousEnd, days } = createDateWindow(range, referenceDate)
  const currentRequests = requests.filter((request) => inWindow(request.timestamp, start, end))
  const previousRequests = requests.filter((request) => inWindow(request.timestamp, previousStart, previousEnd))
  const current = calculateAggregate(currentRequests)
  const previous = calculateAggregate(previousRequests)
  const usageSeries = createUsageSeries(currentRequests, start, days)

  return {
    range,
    rangeLabel: `${formatMonthDay(start)}至 ${formatMonthDay(end)}`,
    totalTokens: current.totalTokens,
    inputTokens: current.inputTokens,
    outputTokens: current.outputTokens,
    totalRequests: current.totalRequests,
    totalCost: current.totalCost,
    successRate: current.successRate,
    kpis: createKpis(current, previous, usageSeries, currentRequests),
    usageSeries,
    modelDistribution: createModelDistribution(currentRequests, current.totalTokens),
    recentRequests: [...currentRequests].sort((first, second) => second.timestamp.localeCompare(first.timestamp)).slice(0, 8),
  }
}

function createModelUsageSeries(requests: readonly AiRequest[], usageSeries: readonly UsagePoint[]): ModelUsagePoint[] {
  const requestsByDay = new Map<string, AiRequest[]>()
  for (const request of requests) {
    const key = dateKey(request.timestamp)
    const values = requestsByDay.get(key) ?? []
    values.push(request)
    requestsByDay.set(key, values)
  }

  return usageSeries.map((point) => {
    const values: Record<keyof typeof AI_MODELS_BY_ID, number> = { reason: 0, flash: 0, vision: 0, code: 0 }
    for (const request of requestsByDay.get(point.date) ?? []) {
      values[request.modelId] += request.inputTokens + request.outputTokens
    }
    return { date: point.date, label: point.label, values }
  })
}

function createModelMetrics(requests: readonly AiRequest[]): ModelAnalyticsMetric[] {
  return Object.values(AI_MODELS_BY_ID).map((model) => {
    const modelRequests = requests.filter((request) => request.modelId === model.id)
    const aggregate = calculateAggregate(modelRequests)
    const latencyTotal = modelRequests.reduce((total, request) => total + request.latencyMs, 0)

    return {
      model,
      requestCount: aggregate.totalRequests,
      totalTokens: aggregate.totalTokens,
      totalCost: aggregate.totalCost,
      successRate: aggregate.successRate,
      averageLatency: modelRequests.length === 0 ? 0 : latencyTotal / modelRequests.length,
    }
  })
}

export function getModelAnalyticsStatistics(
  requests: readonly AiRequest[],
  range: TimeRange,
  referenceDate = DEMO_REFERENCE_DATE,
): ModelAnalyticsStatistics {
  const dashboardStatistics = getDashboardStatistics(requests, range, referenceDate)
  const selectedRequests = getRequestsForRange(requests, range, referenceDate)
  const models = createModelMetrics(selectedRequests)

  return {
    range,
    rangeLabel: dashboardStatistics.rangeLabel,
    activeModelCount: models.filter((model) => model.requestCount > 0).length,
    totalRequests: dashboardStatistics.totalRequests,
    totalTokens: dashboardStatistics.totalTokens,
    totalCost: dashboardStatistics.totalCost,
    models,
    usageSeries: createModelUsageSeries(selectedRequests, dashboardStatistics.usageSeries),
  }
}

function createUsageBillingRecords(requests: readonly AiRequest[], usageSeries: readonly UsagePoint[]): UsageBillingRecord[] {
  const requestsByDateAndModel = new Map<string, AiRequest[]>()
  for (const request of requests) {
    const key = `${dateKey(request.timestamp)}:${request.modelId}`
    const values = requestsByDateAndModel.get(key) ?? []
    values.push(request)
    requestsByDateAndModel.set(key, values)
  }

  return usageSeries.flatMap((point) => Object.values(AI_MODELS_BY_ID).flatMap((model) => {
    const modelRequests = requestsByDateAndModel.get(`${point.date}:${model.id}`) ?? []
    if (modelRequests.length === 0) return []
    const aggregate = calculateAggregate(modelRequests)
    return [{
      date: point.date,
      label: point.date.replaceAll('-', '/'),
      model,
      requestCount: aggregate.totalRequests,
      totalTokens: aggregate.totalTokens,
      totalCost: aggregate.totalCost,
    }]
  }))
}

function createUsageBillingTrend(records: readonly UsageBillingRecord[], range: TimeRange): UsageBillingTrendPoint[] {
  const daysPerGroup = range === '1y' ? 7 : 1
  const dates = [...new Set(records.map((record) => record.date))].sort()

  return Array.from({ length: Math.ceil(dates.length / daysPerGroup) }, (_, index) => {
    const dateGroup = dates.slice(index * daysPerGroup, (index + 1) * daysPerGroup)
    const groupRecords = records.filter((record) => dateGroup.includes(record.date))
    const firstDate = dateGroup[0] ?? ''
    const lastDate = dateGroup.at(-1) ?? firstDate
    return {
      date: firstDate,
      label: daysPerGroup === 1 ? firstDate.replaceAll('-', '/') : `${firstDate.slice(5).replace('-', '/')}–${lastDate.slice(5).replace('-', '/')}`,
      totalTokens: groupRecords.reduce((total, record) => total + record.totalTokens, 0),
      requestCount: groupRecords.reduce((total, record) => total + record.requestCount, 0),
      totalCost: groupRecords.reduce((total, record) => total + record.totalCost, 0),
    }
  })
}

function createModelCosts(records: readonly UsageBillingRecord[], totalCost: number): ModelCostMetric[] {
  return Object.values(AI_MODELS_BY_ID).map((model) => {
    const modelRecords = records.filter((record) => record.model.id === model.id)
    const cost = modelRecords.reduce((total, record) => total + record.totalCost, 0)
    return {
      model,
      requestCount: modelRecords.reduce((total, record) => total + record.requestCount, 0),
      totalTokens: modelRecords.reduce((total, record) => total + record.totalTokens, 0),
      totalCost: cost,
      costPercentage: totalCost === 0 ? 0 : (cost / totalCost) * 100,
    }
  }).sort((first, second) => second.totalCost - first.totalCost)
}

export function getUsageBillingStatistics(
  requests: readonly AiRequest[],
  range: TimeRange,
  referenceDate = DEMO_REFERENCE_DATE,
): UsageBillingStatistics {
  const dashboardStatistics = getDashboardStatistics(requests, range, referenceDate)
  const selectedRequests = getRequestsForRange(requests, range, referenceDate)
  const records = createUsageBillingRecords(selectedRequests, dashboardStatistics.usageSeries)

  return {
    range,
    rangeLabel: dashboardStatistics.rangeLabel,
    totalTokens: dashboardStatistics.totalTokens,
    totalRequests: dashboardStatistics.totalRequests,
    totalCost: dashboardStatistics.totalCost,
    averageRequestCost: dashboardStatistics.totalRequests === 0 ? 0 : dashboardStatistics.totalCost / dashboardStatistics.totalRequests,
    trendSeries: createUsageBillingTrend(records, range),
    records,
    modelCosts: createModelCosts(records, dashboardStatistics.totalCost),
  }
}

function escapeCsvValue(value: string | number) {
  const text = String(value)
  const safeValue = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue
}

export function createUsageCsv(records: readonly UsageBillingRecord[], rangeLabel: string) {
  const rows: Array<Array<string | number>> = [
    ['資料類型', '示範資料'],
    ['統計期間', rangeLabel],
    [],
    ['日期', '模型名稱', '請求數', 'Token 使用量', '預估費用 (USD)', '備註'],
    ...records.map((record) => [
      record.label,
      record.model.name,
      record.requestCount,
      record.totalTokens,
      record.totalCost.toFixed(6),
      '每日使用彙總示範資料',
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')}\r\n`
}

export function createUsageCsvFilename(records: readonly UsageBillingRecord[]) {
  const dates = [...new Set(records.map((record) => record.date))].sort()
  const start = dates[0] ?? 'no-data'
  const end = dates.at(-1) ?? start
  return `neurova-usage-demo-${start}_to_${end}.csv`
}

export function formatMetricValue(format: MetricFormat, value: number) {
  if (format === 'percentage') return `${value.toFixed(1)}%`
  if (format === 'currency') {
    return `US$${new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`
  }
  if (format === 'tokens') {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value)
  }
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value)
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-TW').format(value)
}

export function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}

export function formatLatency(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${value} ms`
}

export function getStatusLabel(status: RequestStatus) {
  return { success: '成功', failed: '失敗', pending: '處理中' }[status]
}

export function getEventTypeLabel(eventType: ActivityEventType) {
  return { request: '請求事件' }[eventType]
}

function getActivityResultSummary(status: RequestStatus) {
  if (status === 'success') return '請求已完成，示範回應已彙整。'
  if (status === 'failed') return '請求未完成，示範環境未保存任何敏感輸入或 API 金鑰。'
  return '請求正在處理中，將於示範流程完成後更新狀態。'
}

export function getActivityLogStatistics(
  requests: readonly AiRequest[],
  range: TimeRange,
  referenceDate = DEMO_REFERENCE_DATE,
): ActivityLogStatistics {
  const selectedRequests = getRequestsForRange(requests, range, referenceDate)
  const aggregate = calculateAggregate(selectedRequests)
  const entries = selectedRequests
    .map((request): ActivityLogEntry => ({
      id: request.id,
      timestamp: request.timestamp,
      model: AI_MODELS_BY_ID[request.modelId],
      eventType: 'request',
      status: request.status,
      totalTokens: request.inputTokens + request.outputTokens,
      estimatedCost: calculateRequestCost(request),
      latencyMs: request.latencyMs,
      resultSummary: getActivityResultSummary(request.status),
    }))
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp))

  return {
    range,
    rangeLabel: getDashboardStatistics(requests, range, referenceDate).rangeLabel,
    requestEvents: aggregate.totalRequests,
    successfulRequests: aggregate.successfulRequests,
    failedRequests: selectedRequests.filter((request) => request.status === 'failed').length,
    successRate: aggregate.successRate,
    entries,
  }
}

export interface ActivityLogFilters {
  query: string
  modelId: AiModel['id'] | 'all'
  status: RequestStatus | 'all'
  eventType: ActivityEventType | 'all'
}

export function filterActivityLogs(entries: readonly ActivityLogEntry[], filters: ActivityLogFilters) {
  const query = filters.query.trim().toLocaleLowerCase('zh-TW')
  return entries.filter((entry) => {
    const matchesQuery = !query || [entry.id, entry.model.name, getEventTypeLabel(entry.eventType), getStatusLabel(entry.status)]
      .some((value) => value.toLocaleLowerCase('zh-TW').includes(query))
    return matchesQuery
      && (filters.modelId === 'all' || entry.model.id === filters.modelId)
      && (filters.status === 'all' || entry.status === filters.status)
      && (filters.eventType === 'all' || entry.eventType === filters.eventType)
  })
}

export function paginateActivityLogs<T>(items: readonly T[], requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const start = (page - 1) * pageSize
  return {
    page,
    totalPages,
    items: items.slice(start, start + pageSize),
    firstItem: items.length === 0 ? 0 : start + 1,
    lastItem: Math.min(start + pageSize, items.length),
  }
}

export function createActivityLogsCsv(entries: readonly ActivityLogEntry[], rangeLabel: string) {
  const rows: Array<Array<string | number>> = [
    ['示範資料', 'NEUROVA 活動紀錄'],
    ['統計期間', rangeLabel],
    [],
    ['發生時間', '活動識別碼', '模型名稱', '事件類型', '執行狀態', 'Token 使用量', '預估費用 (USD)', '執行時間 (ms)', '結果摘要'],
    ...entries.map((entry) => [
      formatDateTime(entry.timestamp),
      entry.id,
      entry.model.name,
      getEventTypeLabel(entry.eventType),
      getStatusLabel(entry.status),
      entry.totalTokens,
      entry.estimatedCost.toFixed(6),
      entry.latencyMs,
      entry.resultSummary,
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')}\r\n`
}

export function createActivityLogsCsvFilename(entries: readonly ActivityLogEntry[]) {
  const dates = entries.map((entry) => entry.timestamp.slice(0, 10)).sort()
  const start = dates[0] ?? 'no-data'
  const end = dates.at(-1) ?? start
  return `neurova-activity-logs-demo-${start}_to_${end}.csv`
}
