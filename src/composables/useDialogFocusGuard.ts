import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Keep focus in this dialog only while it is the topmost modal surface. */
export function useDialogFocusGuard(dialog: Ref<HTMLElement | null>, preferredFocus: Ref<HTMLElement | null>) {
  function onFocusIn(event: FocusEvent) {
    const root = dialog.value
    if (!root || root.contains(event.target as Node)) return
    const openDialogs = document.querySelectorAll<HTMLElement>('[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]')
    if (openDialogs[openDialogs.length - 1] !== root) return
    ;(preferredFocus.value?.isConnected ? preferredFocus.value : root).focus()
  }

  onMounted(() => window.addEventListener('focusin', onFocusIn, true))
  onBeforeUnmount(() => window.removeEventListener('focusin', onFocusIn, true))
}
