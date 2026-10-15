import { afterEach, describe, expect, it, vi } from 'vitest'
import { acquireDocumentScrollLock } from './useDocumentScrollLock'

afterEach(() => vi.unstubAllGlobals())

describe('document scroll lock', () => {
  it('restores inline overflow only after the last lock is released', () => {
    const html = { style: { overflow: 'clip' } }
    const body = { style: { overflow: 'auto' } }
    vi.stubGlobal('document', { documentElement: html, body, scrollingElement: html })

    const releaseFirst = acquireDocumentScrollLock()
    const releaseSecond = acquireDocumentScrollLock()
    expect(html.style.overflow).toBe('hidden')
    expect(body.style.overflow).toBe('hidden')

    releaseFirst()
    releaseFirst()
    expect(html.style.overflow).toBe('hidden')
    releaseSecond()
    expect(html.style.overflow).toBe('clip')
    expect(body.style.overflow).toBe('auto')
  })
})
