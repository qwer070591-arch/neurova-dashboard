const activeLocks = new Set<symbol>()
let originalOverflow: Array<{ element: HTMLElement; value: string }> = []

/** Lock the document scroller while one or more modal surfaces are mounted. */
export function acquireDocumentScrollLock(): () => void {
  const token = Symbol('document-scroll-lock')

  if (activeLocks.size === 0) {
    const elements = new Set<HTMLElement>([document.documentElement, document.body])
    if (document.scrollingElement) elements.add(document.scrollingElement as HTMLElement)
    originalOverflow = [...elements].map((element) => ({ element, value: element.style.overflow }))
    for (const { element } of originalOverflow) element.style.overflow = 'hidden'
  }

  activeLocks.add(token)
  return () => {
    if (!activeLocks.delete(token) || activeLocks.size > 0) return
    for (const { element, value } of originalOverflow) element.style.overflow = value
    originalOverflow = []
  }
}
