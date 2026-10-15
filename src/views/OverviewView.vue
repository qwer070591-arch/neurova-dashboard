<script setup lang="ts">
import { Activity, Braces, CircleDollarSign, CircleGauge } from '@lucide/vue'
import { defineAsyncComponent } from 'vue'
import KpiCard from '../components/dashboard/KpiCard.vue'
import RangeSelector from '../components/dashboard/RangeSelector.vue'
import RecentActivity from '../components/dashboard/RecentActivity.vue'
import PageScaffold from '../components/ui/PageScaffold.vue'
import { useDashboardStore } from '../stores/dashboard'
import { useUiStore } from '../stores/ui'

const dashboardStore = useDashboardStore()
const uiStore = useUiStore()
const UsageChart = defineAsyncComponent(() => import('../components/charts/UsageChart.vue'))
const ModelDistributionChart = defineAsyncComponent(() => import('../components/charts/ModelDistributionChart.vue'))

const kpiIcons = {
  tokens: Braces,
  requests: Activity,
  cost: CircleDollarSign,
  successRate: CircleGauge,
}
</script>

<template>
  <PageScaffold
    title="總覽"
    summary="以固定示範資料監控 AI 使用量、穩定性與預估費用。"
  >
    <template #header-actions>
      <RangeSelector :range="dashboardStore.selectedRange" @update:range="dashboardStore.setRange" />
    </template>

    <div class="overview-dashboard">
      <p class="overview-dashboard__range" aria-live="polite">統計期間：{{ dashboardStore.statistics.rangeLabel }} · UTC</p>

      <section class="overview-dashboard__kpis" aria-label="關鍵績效指標">
        <KpiCard
          v-for="metric in dashboardStore.statistics.kpis"
          :key="metric.key"
          :metric="metric"
          :icon="kpiIcons[metric.key]"
        />
      </section>

      <section class="analytics-panel" aria-labelledby="usage-analytics-title">
        <header class="analytics-panel__header">
          <div>
            <p class="analytics-panel__eyebrow">使用量分析</p>
            <h2 id="usage-analytics-title">Token 與請求數趨勢</h2>
          </div>
          <span class="analytics-panel__context">每日彙總</span>
        </header>
        <UsageChart :data="dashboardStore.statistics.usageSeries" :theme="uiStore.theme" />
      </section>

      <section class="overview-dashboard__lower">
        <article class="distribution-panel" aria-labelledby="distribution-title">
          <header class="distribution-panel__header">
            <div>
              <p class="analytics-panel__eyebrow">模型使用分布</p>
              <h2 id="distribution-title">依模型統計使用量</h2>
            </div>
            <span class="analytics-panel__context">依 Token 總量</span>
          </header>
          <ModelDistributionChart :data="dashboardStore.statistics.modelDistribution" :theme="uiStore.theme" />
        </article>

        <RecentActivity :requests="dashboardStore.statistics.recentRequests" />
      </section>
    </div>
  </PageScaffold>
</template>

<style scoped>
.overview-dashboard {
  display: grid;
  gap: clamp(var(--space-6), 2.5vw, var(--space-8));
}

.overview-dashboard__range {
  margin: calc(var(--space-4) * -1) 0 0;
  color: var(--color-text-subtle);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.overview-dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.analytics-panel,
.distribution-panel {
  min-width: 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: var(--shadow-surface);
}

.analytics-panel__header,
.distribution-panel__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.analytics-panel__eyebrow {
  margin: 0 0 var(--space-1);
  color: var(--color-secondary-text);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.analytics-panel h2,
.distribution-panel h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.0625rem;
  letter-spacing: -0.02em;
}

.analytics-panel__context {
  flex: 0 0 auto;
  padding: 0.3125rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}

.overview-dashboard__lower {
  display: grid;
  grid-template-columns: minmax(18rem, 0.84fr) minmax(30rem, 1.4fr);
  align-items: start;
  gap: var(--space-4);
}

@media (max-width: 75rem) {
  .overview-dashboard__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-dashboard__lower {
    grid-template-columns: minmax(17rem, 0.8fr) minmax(24rem, 1.2fr);
  }
}

@media (max-width: 64rem) {
  .overview-dashboard__lower {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 40rem) {
  .overview-dashboard__kpis {
    grid-template-columns: 1fr;
  }

  .analytics-panel,
  .distribution-panel {
    padding: var(--space-4);
  }

  .analytics-panel__header,
  .distribution-panel__header {
    align-items: start;
    flex-direction: column;
    gap: var(--space-2);
  }
}
</style>
