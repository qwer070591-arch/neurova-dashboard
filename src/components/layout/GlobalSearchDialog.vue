<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { acquireDocumentScrollLock } from '../../composables/useDocumentScrollLock'
import { filterSearchEntries } from '../../utils/header'

const emit = defineEmits<{
  close: []
  navigate: [path: string]
}>()

const query = ref('')
const activeIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const results = computed(() => filterSearchEntries(query.value))
const activeId = computed(() => results.value[activeIndex.value] ? `search-result-${results.value[activeIndex.value]!.id}` : undefined)

watch(query, () => { activeIndex.value = 0 })
let releaseScrollLock: (() => void) | undefined
onMounted(() => {
  releaseScrollLock = acquireDocumentScrollLock()
  nextTick(() => input.value?.focus())
})
onBeforeUnmount(() => { releaseScrollLock?.() })

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!results.value.length) return
    activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + results.value.length) % results.value.length
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    activeIndex.value = event.key === 'Home' ? 0 : Math.max(0, results.value.length - 1)
  } else if (event.key === 'Enter' && results.value[activeIndex.value]) {
    event.preventDefault()
    emit('navigate', results.value[activeIndex.value]!.path)
  }
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  } else if (event.key === 'Tab') {
    // Only the search input and close button participate in the tab sequence.
    if (event.shiftKey && document.activeElement === input.value) {
      event.preventDefault()
      closeButton.value?.focus()
    } else if (!event.shiftKey && document.activeElement === closeButton.value) {
      event.preventDefault()
      input.value?.focus()
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="global-search__backdrop" @click.self="emit('close')" @touchmove.self.prevent>
      <section
        id="global-search-dialog"
        class="global-search__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        aria-describedby="global-search-description"
        @keydown="onDialogKeydown"
      >
        <div class="global-search__heading">
          <div>
            <h2 id="global-search-title">全站搜尋</h2>
            <p id="global-search-description">搜尋頁面與常用入口；不搜尋資料內容。</p>
          </div>
          <button ref="closeButton" type="button" class="global-search__close" aria-label="關閉全站搜尋" @click="emit('close')"><X :size="18" aria-hidden="true" /></button>
        </div>
        <div class="global-search__input-wrap">
          <Search :size="19" aria-hidden="true" />
          <input
            id="global-search-input"
            ref="input"
            v-model="query"
            type="search"
            role="combobox"
            aria-label="搜尋頁面與常用入口"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="global-search-results"
            :aria-activedescendant="activeId"
            placeholder="搜尋頁面或功能…"
            autocomplete="off"
            @keydown="onInputKeydown"
          />
        </div>
        <div id="global-search-results" class="global-search__results" role="listbox" aria-label="搜尋結果">
          <button
            v-for="(entry, index) in results"
            :id="`search-result-${entry.id}`"
            :key="entry.id"
            type="button"
            role="option"
            tabindex="-1"
            class="global-search__result"
            :class="{ 'global-search__result--active': activeIndex === index }"
            :aria-selected="activeIndex === index"
            @pointermove="activeIndex = index"
            @click="emit('navigate', entry.path)"
          >
            <span><strong>{{ entry.title }}</strong><small>{{ entry.description }}</small></span>
            <em>{{ entry.kind }}</em>
          </button>
        </div>
        <p v-if="!results.length" class="global-search__empty" role="status">找不到符合的頁面或功能入口。</p>
        <p class="global-search__hint">↑ ↓ 選擇　Enter 前往　Esc 關閉</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.global-search__backdrop { position: fixed; z-index: 100; inset: 0; display: flex; justify-content: center; align-items: flex-start; padding: min(12vh, 6rem) var(--space-4) var(--space-4); background: var(--color-overlay); }
.global-search__dialog { width: min(100%, 37rem); max-height: calc(100dvh - min(12vh, 6rem) - 1rem); display: flex; flex-direction: column; min-width: 0; overscroll-behavior: contain; border: 1px solid var(--color-border-strong); border-radius: var(--radius-lg); color: var(--color-text); background: var(--color-surface); box-shadow: var(--shadow-float); }
.global-search__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); padding: var(--space-5); }
.global-search__heading h2 { margin: 0; font-size: 1.125rem; }
.global-search__heading p { margin: var(--space-1) 0 0; color: var(--color-text-muted); font-size: .8125rem; }
.global-search__close { display: grid; flex: 0 0 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-muted); background: transparent; cursor: pointer; }
.global-search__close:hover, .global-search__result:hover { background: var(--color-surface-elevated); }
.global-search__input-wrap { display: flex; align-items: center; gap: var(--space-3); margin: 0 var(--space-5) var(--space-3); padding: 0 var(--space-3); min-height: 3rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); color: var(--color-text-muted); background: var(--color-surface-muted); }
.global-search__input-wrap:focus-within { border-color: var(--color-primary); }
.global-search__input-wrap input { flex: 1; width: 100%; min-width: 0; border: 0; outline: 0; color: var(--color-text); background: transparent; font: inherit; }
.global-search__results { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--space-3); }
.global-search__result { display: flex; width: 100%; min-height: 3.5rem; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); color: var(--color-text); background: transparent; text-align: left; cursor: pointer; }
.global-search__result--active { background: var(--color-surface-elevated); }
.global-search__result span { display: grid; min-width: 0; gap: .125rem; }
.global-search__result strong { font-size: .875rem; }
.global-search__result small { color: var(--color-text-muted); font-size: .75rem; overflow-wrap: anywhere; }
.global-search__result em { flex: 0 0 auto; color: var(--color-text-subtle); font-size: .6875rem; font-style: normal; }
.global-search__empty { margin: 0; padding: var(--space-8) var(--space-5); color: var(--color-text-muted); text-align: center; }
.global-search__hint { margin: var(--space-2) 0 0; padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); color: var(--color-text-subtle); font-size: .75rem; }
@media (max-width: 30rem) { .global-search__backdrop { padding-top: var(--space-4); } .global-search__dialog { max-height: calc(100dvh - 2rem); } .global-search__heading { padding: var(--space-4); } .global-search__input-wrap { margin-right: var(--space-4); margin-left: var(--space-4); } }
</style>
