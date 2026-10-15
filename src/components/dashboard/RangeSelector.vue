<script setup lang="ts">
import type { TimeRange } from '../../types/analytics'
import { TIME_RANGE_OPTIONS } from '../../utils/analytics'

defineProps<{
  range: TimeRange
}>()

const emit = defineEmits<{
  'update:range': [range: TimeRange]
}>()
</script>

<template>
  <fieldset class="range-selector" aria-label="分析日期範圍">
    <legend class="sr-only">分析日期範圍</legend>
    <button
      v-for="option in TIME_RANGE_OPTIONS"
      :key="option.value"
      class="range-selector__button"
      :class="{ 'range-selector__button--active': range === option.value }"
      type="button"
      :aria-pressed="range === option.value"
      :data-testid="`range-${option.value}`"
      @click="emit('update:range', option.value)"
    >
      {{ option.label }}
    </button>
  </fieldset>
</template>

<style scoped>
.range-selector {
  min-inline-size: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
}

.range-selector__button {
  min-height: 2.75rem;
  padding: 0 var(--space-3);
  border-radius: calc(var(--radius-md) - 0.25rem);
  color: var(--color-text-muted);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard);
}

.range-selector__button:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.range-selector__button--active {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-primary) 20%, var(--color-surface-elevated));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 58%, var(--color-border));
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 30rem) {
  .range-selector {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .range-selector__button {
    width: 100%;
    min-width: 0;
    padding: 0 var(--space-2);
  }
}
</style>
