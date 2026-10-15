<script setup lang="ts">
import { Clock3, ExternalLink, X } from '@lucide/vue'
import { computed, nextTick, ref } from 'vue'
import { AI_MODELS_BY_ID } from '../../mocks/analytics'
import type { AiRequest } from '../../types/analytics'
import { calculateRequestCost, formatDateTime, formatInteger, formatLatency, formatMetricValue, getStatusLabel } from '../../utils/analytics'

defineProps<{
  requests: readonly AiRequest[]
}>()

const selectedRequest = ref<AiRequest | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let lastTrigger: HTMLButtonElement | null = null

const selectedModel = computed(() => (selectedRequest.value ? AI_MODELS_BY_ID[selectedRequest.value.modelId] : null))
const selectedTotalTokens = computed(() => {
  if (!selectedRequest.value) return 0
  return selectedRequest.value.inputTokens + selectedRequest.value.outputTokens
})

function openDetails(request: AiRequest, event: MouseEvent) {
  lastTrigger = event.currentTarget as HTMLButtonElement
  selectedRequest.value = request
  void nextTick(() => closeButton.value?.focus())
}

function closeDetails() {
  selectedRequest.value = null
  void nextTick(() => lastTrigger?.focus())
}
</script>

<template>
  <section class="recent-activity" aria-labelledby="recent-activity-title">
    <header class="recent-activity__header">
      <div>
        <p class="recent-activity__eyebrow">請求遙測資料</p>
        <h2 id="recent-activity-title">最近活動</h2>
      </div>
      <span class="recent-activity__count">最新 {{ requests.length }} 筆</span>
    </header>

    <div v-if="requests.length" class="recent-activity__list" role="list">
      <div class="recent-activity__labels" aria-hidden="true">
        <span>請求 ID</span>
        <span>模型</span>
        <span>Token</span>
        <span>狀態</span>
        <span>延遲</span>
      </div>

      <button
        v-for="request in requests"
        :key="request.id"
        class="activity-row"
        type="button"
        role="listitem"
        :aria-label="`查看請求 ${request.id} 的詳細資訊`"
        :data-testid="`activity-${request.id}`"
        @click="openDetails(request, $event)"
      >
        <span class="activity-row__request">
          <strong>{{ request.id }}</strong>
          <small>{{ formatDateTime(request.timestamp) }}</small>
        </span>
        <span class="activity-row__model">{{ AI_MODELS_BY_ID[request.modelId].name.replace('Neurova ', '') }}</span>
        <span class="activity-row__tokens">{{ formatMetricValue('tokens', request.inputTokens + request.outputTokens) }}</span>
        <span class="activity-row__status" :class="`activity-row__status--${request.status}`">
          <i aria-hidden="true" />{{ getStatusLabel(request.status) }}
        </span>
        <span class="activity-row__latency">{{ formatLatency(request.latencyMs) }}</span>
        <ExternalLink class="activity-row__link" :size="16" aria-hidden="true" />
      </button>
    </div>

    <div v-else class="recent-activity__empty">
      <Clock3 :size="20" aria-hidden="true" />
      <p>此期間暫無最近活動。</p>
    </div>

    <Transition name="activity-dialog">
      <div v-if="selectedRequest" class="activity-dialog__overlay" @click.self="closeDetails">
        <section class="activity-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" @keydown.esc="closeDetails">
          <header class="activity-dialog__header">
            <div>
              <p class="activity-dialog__eyebrow">請求詳細資訊</p>
              <h2 id="activity-dialog-title">{{ selectedRequest.id }}</h2>
            </div>
            <button ref="closeButton" class="activity-dialog__close" type="button" aria-label="關閉請求詳細資訊" @click="closeDetails">
              <X :size="19" aria-hidden="true" />
            </button>
          </header>

          <div class="activity-dialog__status-row">
            <span class="activity-row__status" :class="`activity-row__status--${selectedRequest.status}`">
              <i aria-hidden="true" />{{ getStatusLabel(selectedRequest.status) }}
            </span>
            <span>{{ formatDateTime(selectedRequest.timestamp) }} UTC</span>
          </div>

          <dl class="activity-dialog__grid">
            <div>
              <dt>模型</dt>
              <dd>{{ selectedModel?.name }}</dd>
            </div>
            <div>
              <dt>延遲</dt>
              <dd>{{ formatLatency(selectedRequest.latencyMs) }}</dd>
            </div>
            <div>
              <dt>輸入 Token</dt>
              <dd>{{ formatInteger(selectedRequest.inputTokens) }}</dd>
            </div>
            <div>
              <dt>輸出 Token</dt>
              <dd>{{ formatInteger(selectedRequest.outputTokens) }}</dd>
            </div>
            <div>
              <dt>Token 總量</dt>
              <dd>{{ formatInteger(selectedTotalTokens) }}</dd>
            </div>
            <div>
              <dt>預估費用</dt>
              <dd>{{ formatMetricValue('currency', calculateRequestCost(selectedRequest)) }}</dd>
            </div>
          </dl>

          <p class="activity-dialog__model-note">{{ selectedModel?.description }}</p>
        </section>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.recent-activity {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: var(--shadow-surface);
}

.recent-activity__header,
.activity-dialog__header,
.activity-dialog__status-row,
.activity-row__status {
  display: flex;
  align-items: center;
}

.recent-activity__header,
.activity-dialog__header {
  justify-content: space-between;
  gap: var(--space-4);
}

.recent-activity__header {
  padding: var(--space-5) var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.recent-activity__eyebrow,
.activity-dialog__eyebrow {
  margin: 0 0 var(--space-1);
  color: var(--color-secondary-text);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.recent-activity h2,
.activity-dialog h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.recent-activity__count {
  flex: 0 0 auto;
  padding: 0.3125rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}

.recent-activity__labels,
.activity-row {
  display: grid;
  grid-template-columns: minmax(8.5rem, 1.4fr) minmax(6rem, 1fr) minmax(4rem, 0.62fr) minmax(4.6rem, 0.7fr) minmax(4rem, 0.5fr) 1rem;
  align-items: center;
  column-gap: var(--space-3);
}

.recent-activity__labels {
  padding: var(--space-3) var(--space-5);
  color: var(--color-text-subtle);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.activity-row {
  width: 100%;
  min-height: 4.25rem;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
  color: var(--color-text-muted);
  background: transparent;
  text-align: left;
  transition: color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard);
}

.activity-row:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.activity-row__request {
  display: grid;
  min-width: 0;
  gap: 0.125rem;
}

.activity-row__request strong {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  font-weight: 600;
}

.activity-row__request small {
  color: var(--color-text-subtle);
  font-size: 0.6875rem;
}

.activity-row__model,
.activity-row__tokens,
.activity-row__latency {
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-row__tokens,
.activity-row__latency {
  font-variant-numeric: tabular-nums;
}

.activity-row__status {
  gap: var(--space-1);
  font-size: 0.6875rem;
  font-weight: 700;
}

.activity-row__status i {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background: currentColor;
}

.activity-row__status--success {
  color: var(--color-success-text);
}

.activity-row__status--failed {
  color: var(--color-error-text);
}

.activity-row__status--pending {
  color: var(--color-warning-text);
}

.activity-row__link {
  justify-self: end;
  color: var(--color-text-subtle);
}

.recent-activity__empty {
  display: grid;
  min-height: 16rem;
  place-content: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  text-align: center;
}

.recent-activity__empty p {
  margin: 0;
  font-size: 0.8125rem;
}

.activity-dialog__overlay {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
}

.activity-dialog {
  width: min(100%, 34rem);
  padding: var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-surface-elevated);
  box-shadow: var(--shadow-float);
}

.activity-dialog__header {
  align-items: start;
}

.activity-dialog__header h2 {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(1rem, 3vw, 1.25rem);
}

.activity-dialog__close {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: transparent;
}

.activity-dialog__close:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.activity-dialog__status-row {
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.activity-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-5) 0 0;
}

.activity-dialog__grid div {
  min-width: 0;
}

.activity-dialog__grid dt {
  color: var(--color-text-subtle);
  font-size: 0.6875rem;
}

.activity-dialog__grid dd {
  margin: var(--space-1) 0 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.activity-dialog__model-note {
  margin: var(--space-5) 0 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface));
  font-size: 0.75rem;
}

.activity-dialog-enter-active,
.activity-dialog-leave-active {
  transition: opacity var(--motion-base) var(--ease-standard);
}

.activity-dialog-enter-active .activity-dialog,
.activity-dialog-leave-active .activity-dialog {
  transition: opacity var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-standard);
}

.activity-dialog-enter-from,
.activity-dialog-leave-to {
  opacity: 0;
}

.activity-dialog-enter-from .activity-dialog,
.activity-dialog-leave-to .activity-dialog {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.98);
}

@media (max-width: 48rem) {
  .recent-activity__labels {
    display: none;
  }

  .activity-row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--space-2);
  }

  .activity-row__request {
    grid-column: 1;
  }

  .activity-row__link {
    grid-column: 2;
    grid-row: 1;
  }

  .activity-row__model,
  .activity-row__tokens,
  .activity-row__status,
  .activity-row__latency {
    grid-row: 2;
  }

  .activity-row__model {
    grid-column: 1;
  }

  .activity-row__tokens {
    display: block;
    grid-column: 1;
    grid-row: 3;
    color: var(--color-text-subtle);
    font-size: 0.6875rem;
  }

  .activity-row__status {
    justify-self: end;
    grid-column: 2;
  }

  .activity-row__latency {
    display: block;
    justify-self: end;
    grid-column: 2;
    grid-row: 3;
    color: var(--color-text-subtle);
    font-size: 0.6875rem;
  }
}

@media (max-width: 32rem) {
  .recent-activity__header,
  .activity-row {
    padding-right: var(--space-4);
    padding-left: var(--space-4);
  }

  .activity-dialog__overlay {
    padding: var(--space-3);
  }

  .activity-dialog {
    padding: var(--space-5);
  }

  .activity-dialog__grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}
</style>
