<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export interface MobileFilterOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: readonly MobileFilterOption[]
  labelId: string
  id: string
  testId: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const listbox = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const activeIndex = ref(0)
const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? props.options[0])
const listboxId = computed(() => `${props.id}-options`)

function selectedIndex() {
  return Math.max(0, props.options.findIndex((option) => option.value === props.modelValue))
}

function setActive(index: number) {
  activeIndex.value = Math.min(Math.max(index, 0), Math.max(0, props.options.length - 1))
}

function closeMenu(restoreFocus = false) {
  isOpen.value = false
  if (restoreFocus) void nextTick(() => trigger.value?.focus())
}

function openMenu(direction: 'start' | 'end' = 'start') {
  if (!props.options.length) return
  setActive(direction === 'end' ? props.options.length - 1 : selectedIndex())
  isOpen.value = true
  void nextTick(() => listbox.value?.focus())
}

function choose(value: string) {
  emit('update:modelValue', value)
  closeMenu(true)
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    isOpen.value ? closeMenu() : openMenu()
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openMenu('start')
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    openMenu('end')
  }
  if (event.key === 'Home') {
    event.preventDefault()
    openMenu('start')
    setActive(0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    openMenu('end')
  }
}

function focusRelativeToTrigger(backward: boolean) {
  const focusable = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => (
    (element === trigger.value || !root.value?.contains(element))
    && window.getComputedStyle(element).display !== 'none'
    && window.getComputedStyle(element).visibility !== 'hidden'
    && element.getClientRects().length > 0
  ))
  const index = trigger.value ? focusable.indexOf(trigger.value) : -1
  closeMenu()
  void nextTick(() => focusable[index + (backward ? -1 : 1)]?.focus())
}

function handleListboxKeydown(event: KeyboardEvent) {
  if (!props.options.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    setActive(activeIndex.value + 1)
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    setActive(activeIndex.value - 1)
  }
  if (event.key === 'Home') {
    event.preventDefault()
    setActive(0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    setActive(props.options.length - 1)
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(props.options[activeIndex.value]!.value)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    focusRelativeToTrigger(event.shiftKey)
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))
</script>

<template>
  <div ref="root" class="mobile-filter-select" :data-testid="`${testId}-mobile`">
    <button
      ref="trigger"
      class="mobile-filter-select__trigger"
      type="button"
      :aria-labelledby="labelId"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :data-testid="`${testId}-trigger`"
      @click="isOpen ? closeMenu() : openMenu()"
      @keydown="handleTriggerKeydown"
    >
      <span>{{ selectedOption?.label }}</span>
      <ChevronDown :size="16" :class="{ 'mobile-filter-select__chevron--open': isOpen }" aria-hidden="true" />
    </button>
    <ul
      v-if="isOpen"
      :id="listboxId"
      ref="listbox"
      class="mobile-filter-select__options"
      role="listbox"
      tabindex="0"
      :aria-labelledby="labelId"
      :aria-activedescendant="`${id}-option-${options[activeIndex]?.value}`"
      :data-testid="`${testId}-options`"
      @keydown="handleListboxKeydown"
    >
      <li
        v-for="(option, index) in options"
        :id="`${id}-option-${option.value}`"
        :key="option.value"
        class="mobile-filter-select__option"
        :class="{
          'mobile-filter-select__option--active': index === activeIndex,
          'mobile-filter-select__option--selected': option.value === modelValue,
        }"
        role="option"
        :aria-selected="option.value === modelValue"
        @mouseenter="setActive(index)"
        @click="choose(option.value)"
      >
        <span>{{ option.label }}</span>
        <Check v-if="option.value === modelValue" :size="16" aria-hidden="true" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.mobile-filter-select { position: relative; min-width: 0; }
.mobile-filter-select__trigger { display: flex; width: 100%; min-height: 2.75rem; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font: inherit; text-align: left; }
.mobile-filter-select__trigger > span, .mobile-filter-select__option > span { min-width: 0; overflow-wrap: anywhere; }
.mobile-filter-select__trigger:hover, .mobile-filter-select__trigger[aria-expanded='true'] { border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border)); background: var(--color-surface-elevated); }
.mobile-filter-select__trigger svg { flex: 0 0 auto; color: var(--color-text-subtle); transition: transform var(--motion-fast) var(--ease-standard); }
.mobile-filter-select__chevron--open { transform: rotate(180deg); }
.mobile-filter-select__options { position: absolute; z-index: 30; top: calc(100% + var(--space-2)); right: 0; left: 0; display: grid; max-height: min(15rem, 45dvh); margin: 0; padding: var(--space-1); overflow-y: auto; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-text); background: var(--color-surface-elevated); box-shadow: var(--shadow-float); list-style: none; }
.mobile-filter-select__option { display: flex; min-height: 2.75rem; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-3); border-radius: calc(var(--radius-md) - 0.25rem); color: var(--color-text-muted); font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
.mobile-filter-select__option--active, .mobile-filter-select__option:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface)); }
.mobile-filter-select__option--selected { color: var(--color-primary-strong); }
.mobile-filter-select__option svg { flex: 0 0 auto; }
</style>
