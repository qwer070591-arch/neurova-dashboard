<script setup lang="ts">
defineProps<{
  title: string
  summary: string
  phase?: string
}>()
</script>

<template>
  <section class="page-scaffold" :aria-labelledby="`${title}-title`">
    <header class="page-scaffold__header">
      <div>
        <p class="page-scaffold__eyebrow">NEUROVA <span>·</span> AI 分析與智慧平台</p>
        <h1 :id="`${title}-title`">{{ title }}</h1>
        <p class="page-scaffold__summary">{{ summary }}</p>
      </div>
      <div class="page-scaffold__actions">
        <slot name="header-actions">
          <span v-if="phase" class="page-scaffold__phase">{{ phase }}</span>
        </slot>
      </div>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.page-scaffold {
  display: grid;
  gap: clamp(var(--space-6), 3vw, var(--space-10));
}

.page-scaffold__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-scaffold__header > * {
  min-width: 0;
}

.page-scaffold__actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.page-scaffold__eyebrow {
  margin: 0 0 var(--space-3);
  color: var(--color-secondary-text);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.page-scaffold__eyebrow span {
  color: var(--color-text-subtle);
}

h1 {
  max-width: 42rem;
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.page-scaffold__summary {
  max-width: 42rem;
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: 0.9375rem;
}

.page-scaffold__phase {
  flex: 0 0 auto;
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-primary) 42%, var(--color-border));
  border-radius: 999px;
  color: var(--color-primary-strong);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  font-size: 0.75rem;
  font-weight: 600;
}

@media (max-width: 40rem) {
  .page-scaffold__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .page-scaffold__actions {
    width: 100%;
  }
}
</style>
