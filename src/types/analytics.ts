export type TimeRange = '7d' | '30d' | '90d' | '1y'

export type RequestStatus = 'success' | 'failed' | 'pending'

export type MetricFormat = 'tokens' | 'number' | 'currency' | 'percentage'

export interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

export interface AiModel {
  id: 'reason' | 'flash' | 'vision' | 'code'
  name: string
  description: string
  colorToken: string
  pricing: ModelPricing
}

export interface AiRequest {
  id: string
  modelId: AiModel['id']
  inputTokens: number
  outputTokens: number
  status: RequestStatus
  latencyMs: number
  timestamp: string
}

export type ActivityEventType = 'request'

export interface ActivityLogEntry {
  id: string
  timestamp: string
  model: AiModel
  eventType: ActivityEventType
  status: RequestStatus
  totalTokens: number
  estimatedCost: number
  latencyMs: number
  resultSummary: string
}

export interface ActivityLogStatistics {
  range: TimeRange
  rangeLabel: string
  requestEvents: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  entries: ActivityLogEntry[]
}

export interface UsagePoint {
  date: string
  label: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requests: number
}

export interface ModelDistributionItem {
  model: AiModel
  totalTokens: number
  requests: number
  percentage: number
}

export interface ModelAnalyticsMetric {
  model: AiModel
  requestCount: number
  totalTokens: number
  totalCost: number
  successRate: number
  averageLatency: number
}

export interface ModelUsagePoint {
  date: string
  label: string
  values: Record<AiModel['id'], number>
}

export interface ModelAnalyticsStatistics {
  range: TimeRange
  rangeLabel: string
  activeModelCount: number
  totalRequests: number
  totalTokens: number
  totalCost: number
  models: ModelAnalyticsMetric[]
  usageSeries: ModelUsagePoint[]
}

export interface UsageBillingTrendPoint {
  date: string
  label: string
  totalTokens: number
  requestCount: number
  totalCost: number
}

export interface UsageBillingRecord {
  date: string
  label: string
  model: AiModel
  requestCount: number
  totalTokens: number
  totalCost: number
}

export interface ModelCostMetric {
  model: AiModel
  requestCount: number
  totalTokens: number
  totalCost: number
  costPercentage: number
}

export interface UsageBillingStatistics {
  range: TimeRange
  rangeLabel: string
  totalTokens: number
  totalRequests: number
  totalCost: number
  averageRequestCost: number
  trendSeries: UsageBillingTrendPoint[]
  records: UsageBillingRecord[]
  modelCosts: ModelCostMetric[]
}

export interface KpiMetric {
  key: 'tokens' | 'requests' | 'cost' | 'successRate'
  label: string
  value: number
  previousValue: number
  trendPercent: number
  comparisonLabel: string
  tooltip: string
  sparkline: number[]
  format: MetricFormat
}

export interface DashboardStatistics {
  range: TimeRange
  rangeLabel: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalRequests: number
  totalCost: number
  successRate: number
  kpis: KpiMetric[]
  usageSeries: UsagePoint[]
  modelDistribution: ModelDistributionItem[]
  recentRequests: AiRequest[]
}
