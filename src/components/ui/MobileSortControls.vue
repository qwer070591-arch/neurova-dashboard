<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@lucide/vue'
import { computed } from 'vue'
import MobileFilterSelect, { type MobileFilterOption } from '../activity-logs/MobileFilterSelect.vue'

const props = defineProps<{
  id: string
  modelValue: string
  options: readonly MobileFilterOption[]
  direction: 'ascending' | 'descending'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'toggle-direction': []
}>()

const selectedLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label ?? '')
const directionLabel = computed(() => props.direction === 'ascending' ? '升序' : '降序')
</script>

<template>
  <div class="mobile-sort" role="group" :data-testid="`${id}-mobile-sort`" aria-label="列表排序">
    <div class="mobile-sort__field">
      <span :id="`${id}-sort-label`" class="mobile-sort__label">排序欄位<span class="sr-only">，目前為{{ selectedLabel }}</span></span>
      <MobileFilterSelect
        v-if="options.length > 1"
        :id="`${id}-sort-field`"
        :test-id="`${id}-sort-field`"
        :label-id="`${id}-sort-label`"
        :model-value="modelValue"
        :options="options"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <span v-else class="mobile-sort__fixed-field">{{ selectedLabel }}</span>
    </div>
    <div class="mobile-sort__field">
      <span class="mobile-sort__label">排序方向</span>
      <button
        class="mobile-sort__direction"
        type="button"
        :aria-label="`排序方向：${directionLabel}，點擊切換`"
        :data-testid="`${id}-sort-direction`"
        @click="emit('toggle-direction')"
      >
        <ArrowUp v-if="direction === 'ascending'" :size="16" aria-hidden="true" />
        <ArrowDown v-else :size="16" aria-hidden="true" />
        {{ directionLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mobile-sort { display: none; }
.mobile-sort__field { display: grid; min-width: 0; gap: var(--space-1); }
.mobile-sort__label { color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 700; }
.mobile-sort__fixed-field, .mobile-sort__direction { display: flex; width: 100%; min-height: 2.75rem; align-items: center; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font: inherit; text-align: left; }
.mobile-sort__direction { cursor: pointer; }
.mobile-sort__direction:hover { border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border)); background: var(--color-surface-elevated); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 48rem) { .mobile-sort { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4); } }
@media (max-width: 30rem) { .mobile-sort { grid-template-columns: minmax(0, 1fr); } }
</style>
