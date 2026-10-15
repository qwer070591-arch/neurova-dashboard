import type { AiModel, AiRequest, RequestStatus } from '../types/analytics'

/**
 * The demo's reference day is deliberately fixed. This makes every refresh,
 * test run, and screenshot use the same mock dataset.
 */
export const DEMO_REFERENCE_DATE = new Date('2026-10-14T12:00:00.000Z')

export const AI_MODELS: readonly AiModel[] = [
  {
    id: 'reason',
    name: 'Neurova Reason',
    description: '長篇推理與規劃任務',
    colorToken: '--color-primary',
    pricing: { inputPerMillion: 12, outputPerMillion: 48 },
  },
  {
    id: 'flash',
    name: 'Neurova Flash',
    description: '快速高流量推論',
    colorToken: '--color-secondary',
    pricing: { inputPerMillion: 0.75, outputPerMillion: 3 },
  },
  {
    id: 'vision',
    name: 'Neurova Vision',
    description: '多模態視覺理解',
    colorToken: '--color-warning',
    pricing: { inputPerMillion: 4, outputPerMillion: 12 },
  },
  {
    id: 'code',
    name: 'Neurova Code',
    description: '程式碼生成與審查',
    colorToken: '--color-success',
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
  },
] as const

export const AI_MODELS_BY_ID = Object.fromEntries(AI_MODELS.map((model) => [model.id, model])) as Record<AiModel['id'], AiModel>

function createRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function chooseModel(random: () => number): AiModel {
  const sample = random()

  if (sample < 0.28) return AI_MODELS[0]
  if (sample < 0.62) return AI_MODELS[1]
  if (sample < 0.81) return AI_MODELS[2]
  return AI_MODELS[3]
}

function chooseStatus(random: () => number, dayIndex: number): RequestStatus {
  const sample = random()

  if (dayIndex < 2 && sample > 0.93) return 'pending'
  if (sample > 0.955) return 'failed'
  return 'success'
}

function createMockRequests(): AiRequest[] {
  const random = createRandom(20261014)
  const requests: AiRequest[] = []
  const totalDays = 420

  for (let dayIndex = totalDays - 1; dayIndex >= 0; dayIndex -= 1) {
    const day = new Date(DEMO_REFERENCE_DATE)
    day.setUTCDate(day.getUTCDate() - dayIndex)
    day.setUTCHours(0, 0, 0, 0)
    const dailyRequests = 6 + Math.floor(random() * 6)

    for (let requestIndex = 0; requestIndex < dailyRequests; requestIndex += 1) {
      const model = chooseModel(random)
      const modelMultiplier = model.id === 'reason' ? 1.7 : model.id === 'vision' ? 1.35 : model.id === 'code' ? 1.2 : 0.85
      const inputTokens = Math.round((900 + random() * 8_600) * modelMultiplier)
      const outputTokens = Math.round((300 + random() * 4_900) * modelMultiplier)
      const timestamp = new Date(day)
      timestamp.setUTCHours(Math.floor(random() * 24), Math.floor(random() * 60), Math.floor(random() * 60))
      const status = chooseStatus(random, dayIndex)
      const baselineLatency = model.id === 'reason' ? 1_450 : model.id === 'vision' ? 1_050 : model.id === 'code' ? 860 : 410

      requests.push({
        id: `nv_${timestamp.toISOString().slice(0, 10).replaceAll('-', '')}_${String(requestIndex + 1).padStart(2, '0')}`,
        modelId: model.id,
        inputTokens,
        outputTokens,
        status,
        latencyMs: Math.round(baselineLatency + random() * baselineLatency * 0.95),
        timestamp: timestamp.toISOString(),
      })
    }
  }

  return requests
}

export const MOCK_REQUESTS: readonly AiRequest[] = createMockRequests()
