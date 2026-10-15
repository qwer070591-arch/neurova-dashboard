/** Return focus after a dialog closes, even if a filtered list removed its trigger. */
export function restoreDialogFocus(trigger: HTMLElement | null) {
  const target = trigger?.isConnected && trigger.getClientRects().length > 0 && !trigger.closest('[inert]')
    ? trigger
    : document.querySelector<HTMLElement>('#main-content')
  if (!target) return

  const openDialogs = document.querySelectorAll<HTMLElement>('[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]')
  const topDialog = openDialogs[openDialogs.length - 1]
  if (topDialog && !topDialog.contains(target)) return
  target.focus()
}
