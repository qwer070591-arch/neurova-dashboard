import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const screenshotDirectory = resolve(process.cwd(), '..', 'output', 'playwright')
mkdirSync(screenshotDirectory, { recursive: true })

type LayoutDiagnostics = {
  innerWidth: number
  clientWidth: number
  scrollWidth: number
  elements: Record<string, { rectWidth: number; computedWidth: string; maxWidth: string; paddingLeft: string; display: string }>
  styleSheets: Array<{ href: string | null; disabled: boolean; ruleCount: number | null }>
}

function monitorConsole(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function expectLayoutForViewport(page: Page, layout: 'desktop' | 'mobile') {
  const sidebar = page.locator('.sidebar')
  const mobileTrigger = page.locator('.mobile-nav-trigger')

  if (layout === 'desktop') {
    await expect(sidebar).toBeVisible()
    await expect(mobileTrigger).toBeHidden()
    return
  }

  await expect(mobileTrigger).toBeVisible()
  await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/)
}

async function getLayoutDiagnostics(page: Page): Promise<LayoutDiagnostics> {
  return page.evaluate(() => {
    const describe = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing required layout element: ${selector}`)
      const style = window.getComputedStyle(element)
      return {
        rectWidth: Number(element.getBoundingClientRect().width.toFixed(2)),
        computedWidth: style.width,
        maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft,
        display: style.display,
      }
    }

    return {
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      elements: {
        html: describe('html'),
        body: describe('body'),
        app: describe('#app'),
        shell: describe('.app-shell'),
        workspace: describe('.app-shell__workspace'),
        main: describe('.app-shell__main'),
      },
      styleSheets: Array.from(document.styleSheets).map((sheet) => {
        let ruleCount: number | null = null
        try {
          ruleCount = sheet.cssRules.length
        } catch {
          ruleCount = null
        }
        return { href: sheet.href, disabled: sheet.disabled, ruleCount }
      }),
    }
  })
}

async function expectUsageBillingGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const rectangle = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing required billing element: ${selector}`)
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, width: rect.width }
    }
    const visibleRectangles = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, width: rect.width }
      })

    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyOverflowX: window.getComputedStyle(document.body).overflowX,
      controls: visibleRectangles('.app-header__actions button, .app-header__search'),
      rangeButtons: visibleRectangles('.range-selector__button'),
      modelContent: visibleRectangles('.model-cost-list__topline > span, .model-cost-list__topline > strong, .model-cost-list__meta > span'),
      recordControls: visibleRectangles('.billing-export, .usage-records__page-size, #usage-page-size, .usage-records__pagination button, .usage-records__pagination span'),
      main: rectangle('.app-shell__main'),
      scaffold: rectangle('.page-scaffold'),
      title: rectangle('h1'),
      summary: rectangle('.page-scaffold__summary'),
      firstKpi: rectangle('.billing-kpi'),
    }
  })

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth)
  expect(geometry.bodyOverflowX).not.toBe('hidden')
  expect(geometry.bodyOverflowX).not.toBe('clip')
  expect(geometry.rangeButtons).toHaveLength(4)
  for (const rectangle of [...geometry.controls, ...geometry.rangeButtons, ...geometry.modelContent, ...geometry.recordControls, geometry.main, geometry.scaffold, geometry.title, geometry.summary, geometry.firstKpi]) {
    expect(rectangle.width).toBeGreaterThan(0)
    expect(rectangle.left).toBeGreaterThanOrEqual(0)
    expect(rectangle.right).toBeLessThanOrEqual(geometry.innerWidth)
  }
}

type PrimaryPageGeometry = {
  viewportWidth: number
  scrollWidth: number
  scaffold: { left: number; right: number; width: number }
  title: { left: number; right: number }
  summary: { left: number; right: number; bottom: number }
  range: { left: number; right: number; top: number; bottom: number; width: number }
  period: { left: number; right: number; top: number }
  rangeButtons: Array<{ left: number; right: number; width: number; top: number }>
}

async function getPrimaryPageGeometry(page: Page): Promise<PrimaryPageGeometry> {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing primary-page element: ${selector}`)
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }
    }
    const periodSelector = '.overview-dashboard__range, .model-analytics-page__range, .billing-page__range'
    const rangeButtons = Array.from(document.querySelectorAll<HTMLElement>('.range-selector__button')).map((button) => {
      const rect = button.getBoundingClientRect()
      return { left: rect.left, right: rect.right, width: rect.width, top: rect.top }
    })
    const scaffold = box('.page-scaffold')
    const title = box('h1')
    const summary = box('.page-scaffold__summary')
    const range = box('.range-selector')
    const period = box(periodSelector)

    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scaffold: { left: scaffold.left, right: scaffold.right, width: scaffold.width },
      title: { left: title.left, right: title.right },
      summary: { left: summary.left, right: summary.right, bottom: summary.bottom },
      range: { left: range.left, right: range.right, top: range.top, bottom: range.bottom, width: range.width },
      period: { left: period.left, right: period.right, top: period.top },
      rangeButtons,
    }
  })
}

function expectWithinOnePixel(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1)
}

function expectFullWidthLayout(diagnostics: LayoutDiagnostics, expectedWidth: number) {
  expect(diagnostics.innerWidth).toBe(expectedWidth)
  expect(diagnostics.clientWidth).toBe(expectedWidth)
  expect(diagnostics.scrollWidth).toBeLessThanOrEqual(expectedWidth)
  for (const [name, element] of Object.entries(diagnostics.elements).filter(([name]) => name !== 'main')) {
    expect(element.rectWidth, `${name} should span the viewport`).toBe(expectedWidth)
  }
  const workspacePaddingLeft = Number.parseFloat(diagnostics.elements.workspace.paddingLeft)
  expect(diagnostics.elements.main.rectWidth + workspacePaddingLeft).toBe(expectedWidth)
  expect(diagnostics.styleSheets.every((sheet) => !sheet.disabled && sheet.ruleCount !== null)).toBe(true)
}

async function openOverview(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/overview')
  await expect(page.getByRole('heading', { name: '總覽', level: 1 })).toBeVisible()
  await expect(page.getByTestId('usage-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('model-distribution-chart')).toHaveAttribute('data-chart-rendered', 'true')
}

test('dashboard renders, filters data, shows request details, and supports themes', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.setViewportSize({ width: 1440, height: 980 })
  await openOverview(page)

  const tokenValue = page.getByTestId('kpi-tokens').locator('.kpi-card__value')
  await expect(tokenValue).not.toHaveText('0')
  await page.waitForTimeout(700)
  const initialTokenValue = await tokenValue.innerText()

  await page.screenshot({ path: resolve(screenshotDirectory, 'zh-tw-desktop-1440.png'), fullPage: true })

  await page.getByTestId('range-7d').click()
  await expect(page.getByTestId('range-7d')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => tokenValue.innerText()).not.toBe(initialTokenValue)
  await expect(page.getByTestId('usage-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('model-distribution-chart')).toHaveAttribute('data-chart-rendered', 'true')

  await page.locator('[data-testid^="activity-"]').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('預估費用', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '關閉請求詳細資訊' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切換為淺色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.sidebar__collapse-button').click()
  await expect(page.locator('.app-shell')).toHaveClass(/app-shell--collapsed/)
  expect(consoleErrors).toEqual([])
})

test('dashboard remains responsive without horizontal overflow and keeps the mobile drawer working', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await openOverview(page)

  for (const viewport of [
    { width: 1440, height: 980 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(180)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.screenshot({ path: resolve(screenshotDirectory, 'zh-tw-mobile-390.png'), fullPage: true })
  await page.locator('.mobile-nav-trigger').click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar--mobile-open/)
  await page.locator('.sidebar__close-button').click()
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--mobile-open/)
  expect(consoleErrors).toEqual([])
})

test('layout remains correct after reloads, persisted preferences, and viewport crossings', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('rwd-test-initialized')) {
      localStorage.clear()
      sessionStorage.setItem('rwd-test-initialized', 'true')
    }
  })

  for (const viewport of [
    { width: 390, height: 844, layout: 'mobile' as const },
    { width: 768, height: 900, layout: 'mobile' as const },
    { width: 1024, height: 900, layout: 'mobile' as const },
    { width: 1440, height: 980, layout: 'desktop' as const },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/overview')
    await expectLayoutForViewport(page, viewport.layout)
    await page.reload()
    await expectLayoutForViewport(page, viewport.layout)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    if (viewport.layout === 'mobile') {
      await page.locator('.mobile-nav-trigger').click()
      await expect(page.locator('.sidebar')).toHaveClass(/sidebar--mobile-open/)
      await page.locator('.sidebar__close-button').click()
      await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--mobile-open/)
    } else {
      await page.locator('.sidebar__collapse-button').click()
      await expect(page.locator('.app-shell')).toHaveClass(/app-shell--collapsed/)
      await page.reload()
      await expectLayoutForViewport(page, 'desktop')
      await expect(page.locator('.app-shell')).toHaveClass(/app-shell--collapsed/)
      await page.locator('.sidebar__collapse-button').click()
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/overview')
  await page.locator('.mobile-nav-trigger').click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar--mobile-open/)
  await page.setViewportSize({ width: 1440, height: 980 })
  await expectLayoutForViewport(page, 'desktop')
  await page.reload()
  await expectLayoutForViewport(page, 'desktop')

  await page.setViewportSize({ width: 390, height: 844 })
  await expectLayoutForViewport(page, 'mobile')
  await page.reload()
  await expectLayoutForViewport(page, 'mobile')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(consoleErrors).toEqual([])
})

test('layout fills every viewport after three consecutive reloads', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 927, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/overview')
    await expect(page.getByTestId('usage-chart')).toHaveAttribute('data-chart-rendered', 'true')

    for (let reload = 0; reload < 3; reload += 1) {
      if (reload > 0) {
        await page.reload()
        await expect(page.getByTestId('usage-chart')).toHaveAttribute('data-chart-rendered', 'true')
      }
      const diagnostics = await getLayoutDiagnostics(page)
      expectFullWidthLayout(diagnostics, viewport.width)
    }
  }

  expect(consoleErrors).toEqual([])
})

test('model analytics supports synchronized ranges, sorting, trend selection, details, themes, and responsive reloads', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/model-analytics')

  await expect(page.getByRole('heading', { name: '模型分析', level: 1 })).toBeVisible()
  await expect(page.getByTestId('model-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('model-comparison')).toBeVisible()
  const requestKpi = page.getByTestId('model-kpi-模型總請求數').locator('strong')
  const initialRequestCount = await requestKpi.innerText()
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase3-model-analytics-desktop-1440.png'), fullPage: true })

  await page.getByTestId('range-7d').click()
  await expect.poll(async () => requestKpi.innerText()).not.toBe(initialRequestCount)
  await expect(page.getByTestId('model-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')

  await expect(page.getByTestId('sort-requests').locator('..')).toHaveAttribute('aria-sort', 'descending')
  await page.getByTestId('sort-tokens').click()
  await expect(page.getByTestId('sort-tokens').locator('..')).toHaveAttribute('aria-sort', 'descending')
  await expect(page.getByTestId('sort-requests').locator('..')).toHaveAttribute('aria-sort', 'none')

  await page.getByTestId('trend-model-reason').click()
  await expect(page.getByTestId('trend-model-reason')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('model-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')

  const reasonRow = page.getByTestId('model-row-reason')
  await reasonRow.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Neurova Reason', level: 2 })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const reasonDetailButton = page.getByTestId('model-detail-button-reason')
  await expect(reasonDetailButton).toBeFocused()
  await expect(reasonRow).not.toHaveAttribute('tabindex')
  await reasonDetailButton.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(reasonDetailButton).toBeFocused()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切換為淺色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  for (const viewport of [
    { width: 1440, height: 980 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await expect(page.getByTestId('model-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.screenshot({ path: resolve(screenshotDirectory, 'phase3-model-analytics-mobile-390.png'), fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('all implemented navigation pages use Traditional Chinese interface copy', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.addInitScript(() => localStorage.clear())

  for (const [path, title] of [
    ['/overview', '總覽'],
    ['/model-analytics', '模型分析'],
    ['/usage-billing', '使用量與費用'],
    ['/activity-logs', '活動紀錄'],
    ['/users', '使用者管理'],
    ['/settings', '系統設定'],
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()
    await expect(page.locator('.app-header__breadcrumb strong')).toHaveText(title)
  }

  await page.goto('/overview')
  await expect(page.getByRole('button', { name: '開啟全站搜尋' })).toBeVisible()
  await expect(page.getByText('近 7 天', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Model Analytics')
  await expect(page.locator('body')).not.toContainText('Usage & Billing')
  expect(consoleErrors).toEqual([])
})

test('usage and billing provides synchronized analytics, safe CSV export, and responsive layouts', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/usage-billing')

  await expect(page.getByRole('heading', { name: '使用量與費用', level: 1 })).toBeVisible()
  await expect(page.getByTestId('usage-billing-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('cost-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('model-cost-distribution')).toBeVisible()
  await expect(page.getByTestId('usage-record-table')).toBeVisible()
  const detailRows = page.locator('[data-testid="usage-record-table"] tbody tr')
  await expect(detailRows).toHaveCount(10)
  await expect(page.getByTestId('usage-pagination-summary')).toHaveText(/顯示第 1–10 筆，共 \d+ 筆/)
  await page.getByTestId('usage-page-next').click()
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 2 頁/)
  await page.getByTestId('sort-usage-date').click()
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 1 頁/)
  await page.getByTestId('usage-page-size').selectOption('20')
  await expect(detailRows).toHaveCount(20)
  await expect(page.getByTestId('usage-pagination-summary')).toHaveText(/顯示第 1–20 筆/)
  await page.getByTestId('usage-page-next').click()
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 2 頁/)

  const billingRequests = page.getByTestId('billing-kpi-請求總數').locator('strong')
  const initialRequests = await billingRequests.innerText()
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase4-usage-billing-desktop-1440.png'), fullPage: true })

  await page.getByTestId('range-7d').click()
  await expect.poll(async () => billingRequests.innerText()).not.toBe(initialRequests)
  const rangeRequests = await billingRequests.innerText()
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 1 頁/)
  await page.getByTestId('usage-page-size').selectOption('10')
  await expect(detailRows).toHaveCount(10)
  await page.getByTestId('usage-page-next').click()
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 2 頁/)
  await expect(page.getByTestId('usage-billing-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('cost-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')

  await page.getByTestId('billing-metric-requests').click()
  await expect(page.getByTestId('billing-metric-requests')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('usage-billing-chart')).toHaveAttribute('data-chart-rendered', 'true')
  await expect(page.getByTestId('sort-usage-date').locator('..')).toHaveAttribute('aria-sort', 'ascending')
  await page.getByTestId('sort-usage-cost').click()
  await expect(page.getByTestId('sort-usage-cost').locator('..')).toHaveAttribute('aria-sort', 'descending')
  await expect(page.getByTestId('usage-page-current')).toHaveText(/第 1 頁/)

  const downloadEvent = page.waitForEvent('download')
  await page.getByTestId('export-usage-csv').click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/^neurova-usage-demo-\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.csv$/)
  const exportPath = resolve(screenshotDirectory, download.suggestedFilename())
  await download.saveAs(exportPath)
  const exportBytes = readFileSync(exportPath)
  expect([...exportBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const exportedRows = exportBytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean)
  expect(exportedRows.length - 3).toBeGreaterThan(await detailRows.count())
  expect(exportBytes.toString('utf8')).toContain('示範資料')

  await page.getByTestId('usage-page-size').selectOption('50')
  await expect(page.getByTestId('usage-page-next')).toHaveCount(0)

  await page.locator('a[href="/overview"]').first().click()
  await expect(page.getByTestId('kpi-requests').locator('.kpi-card__value')).toHaveText(rangeRequests)
  await page.locator('a[href="/model-analytics"]').first().click()
  await expect(page.getByTestId('model-kpi-模型總請求數').locator('strong')).toHaveText(rangeRequests)
  await page.locator('a[href="/usage-billing"]').first().click()
  await expect(page.getByTestId('usage-billing-chart')).toHaveAttribute('data-chart-rendered', 'true')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切換為淺色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await expect(page.getByTestId('usage-billing-chart')).toHaveAttribute('data-chart-rendered', 'true')
    await expect(page.getByTestId('cost-trend-chart')).toHaveAttribute('data-chart-rendered', 'true')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expectUsageBillingGeometry(page)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expectUsageBillingGeometry(page)
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase4-rwd-fixed-390.png'), fullPage: false })
  await expect(page.getByTestId('usage-page-size')).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('primary analytics pages share aligned mobile content and date range controls', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())

  const primaryPages = [
    { path: '/overview', screenshot: 'primary-overview-mobile-390.png' },
    { path: '/model-analytics', screenshot: 'primary-model-analytics-mobile-390.png' },
    { path: '/usage-billing', screenshot: 'primary-usage-billing-mobile-390.png' },
  ]

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    const geometries: PrimaryPageGeometry[] = []

    for (const primaryPage of primaryPages) {
      await page.goto(primaryPage.path)
      await expect(page.locator('h1')).toBeVisible()
      await page.reload()
      await expect(page.locator('h1')).toBeVisible()

      const geometry = await getPrimaryPageGeometry(page)
      expect(geometry.viewportWidth).toBe(viewport.width)
      expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width)
      geometries.push(geometry)

      if (viewport.width === 390) {
        await page.screenshot({ path: resolve(screenshotDirectory, primaryPage.screenshot), fullPage: false })
      }
    }

    const baseline = geometries[0]
    for (const geometry of geometries) {
      expectWithinOnePixel(geometry.scaffold.left, baseline.scaffold.left)
      expectWithinOnePixel(geometry.scaffold.right, baseline.scaffold.right)
      expectWithinOnePixel(geometry.title.left, baseline.title.left)
      expectWithinOnePixel(geometry.summary.left, baseline.summary.left)
      expectWithinOnePixel(geometry.range.left, baseline.range.left)
      expectWithinOnePixel(geometry.range.right, baseline.range.right)
      expectWithinOnePixel(geometry.period.left, baseline.period.left)
      expectWithinOnePixel(geometry.period.right, baseline.period.right)
      expect(geometry.rangeButtons).toHaveLength(4)

      for (const button of geometry.rangeButtons) {
        expect(button.left).toBeGreaterThanOrEqual(geometry.range.left)
        expect(button.right).toBeLessThanOrEqual(geometry.range.right)
      }

      if (viewport.width <= 480) {
        expectWithinOnePixel(geometry.range.width, geometry.scaffold.width)
        expectWithinOnePixel(geometry.range.top - geometry.summary.bottom, baseline.range.top - baseline.summary.bottom)
        expectWithinOnePixel(geometry.period.top - geometry.range.bottom, baseline.period.top - baseline.range.bottom)
        expectWithinOnePixel(geometry.rangeButtons[0].width, geometry.rangeButtons[1].width)
        expectWithinOnePixel(geometry.rangeButtons[2].width, geometry.rangeButtons[3].width)
        expect(geometry.rangeButtons[0].top).toBe(geometry.rangeButtons[1].top)
        expect(geometry.rangeButtons[2].top).toBe(geometry.rangeButtons[3].top)
        expect(geometry.rangeButtons[2].top).toBeGreaterThan(geometry.rangeButtons[0].top)
      } else {
        for (const button of geometry.rangeButtons) {
          expect(button.top).toBe(geometry.rangeButtons[0].top)
        }
      }
    }
  }

  expect(consoleErrors).toEqual([])
})

test('activity logs filters request events, exports all matches, and remains accessible across viewports', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/activity-logs')

  await expect(page.getByTestId('activity-log-table')).toBeVisible()
  const rows = page.getByTestId('activity-log-table').locator('tbody tr')
  await expect(rows).toHaveCount(10)
  await expect(page.getByTestId('activity-kpi-requests').locator('strong')).not.toHaveText('0')
  await expect(page.getByTestId('activity-kpi-rate').locator('strong')).toHaveText(/%$/)
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase5-activity-logs-desktop-1440.png'), fullPage: true })

  await page.getByTestId('activity-model-filter').selectOption('reason')
  await expect(page.getByTestId('clear-activity-filters')).toBeVisible()
  await expect(page.getByTestId('activity-pagination-summary')).toContainText('共')
  const filteredPageRows = await rows.count()
  const downloadEvent = page.waitForEvent('download')
  await page.getByTestId('export-activity-csv').click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/^neurova-activity-logs-demo-\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.csv$/)
  const exportPath = resolve(screenshotDirectory, download.suggestedFilename())
  await download.saveAs(exportPath)
  const exportedRows = readFileSync(exportPath).toString('utf8').trim().split(/\r?\n/).filter(Boolean)
  expect(exportedRows.length - 3).toBeGreaterThan(filteredPageRows)

  await page.getByTestId('activity-page-next').click()
  await expect(page.getByTestId('activity-page-current')).toContainText('第 2 頁')
  await page.getByTestId('activity-page-size').selectOption('20')
  await expect(page.getByTestId('activity-page-current')).toContainText('第 1 頁')
  await expect(rows).toHaveCount(20)
  await page.getByTestId('sort-activity-time').click()
  await expect(page.getByTestId('sort-activity-time').locator('..')).toHaveAttribute('aria-sort', 'ascending')

  const detailTrigger = page.locator('[data-testid^="activity-detail-"]').first()
  await detailTrigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const dialogClose = page.getByRole('dialog').getByRole('button', { name: '關閉活動詳情' })
  await expect(dialogClose).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialogClose).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialogClose).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(detailTrigger).toBeFocused()

  await page.getByTestId('clear-activity-filters').click()
  await expect(page.getByTestId('clear-activity-filters')).toHaveCount(0)
  await page.getByTestId('activity-search').fill('not-a-real-activity')
  await expect(page.getByTestId('activity-empty')).toBeVisible()
  await page.getByTestId('clear-activity-filters').click()
  await expect(page.getByTestId('activity-log-table')).toBeVisible()
  await page.getByTestId('range-7d').click()
  await expect(page.getByTestId('activity-kpi-requests').locator('strong')).not.toHaveText('0')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切換為淺色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await expect(page.getByTestId('activity-log-table')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const geometry = await page.evaluate(() => {
      const rects = Array.from(document.querySelectorAll<HTMLElement>('.range-selector__button, .activity-export, .activity-filter input, .activity-filter select, #activity-page-size, .activity-pagination button'))
        .filter((element) => window.getComputedStyle(element).display !== 'none')
        .map((element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width } })
      const rangeButtons = Array.from(document.querySelectorAll<HTMLElement>('.range-selector__button')).map((element) => {
        const rect = element.getBoundingClientRect()
        return { top: rect.top, width: rect.width }
      })
      return { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, rects, rangeButtons }
    })
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width)
    for (const rectangle of geometry.rects) {
      expect(rectangle.width).toBeGreaterThan(0)
      expect(rectangle.left).toBeGreaterThanOrEqual(0)
      expect(rectangle.right).toBeLessThanOrEqual(geometry.width)
    }
    expect(geometry.rangeButtons).toHaveLength(4)
    if (viewport.width <= 480) {
      expect(geometry.rangeButtons[0].top).toBe(geometry.rangeButtons[1].top)
      expect(geometry.rangeButtons[2].top).toBe(geometry.rangeButtons[3].top)
      expect(geometry.rangeButtons[2].top).toBeGreaterThan(geometry.rangeButtons[0].top)
      expectWithinOnePixel(geometry.rangeButtons[0].width, geometry.rangeButtons[1].width)
    } else {
      expect(geometry.rangeButtons.every((button) => button.top === geometry.rangeButtons[0].top)).toBe(true)
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase5-activity-logs-mobile-390.png'), fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('activity filters share a viewport-bound mobile listbox while desktop retains native selects', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.addInitScript(() => localStorage.clear())
  const filters = [
    { id: 'activity-model-filter', label: 'Neurova Code', value: 'code', desktopValue: 'reason', navigation: 'End', screenshot: 'phase5-activity-model-filter-open-390.png' },
    { id: 'activity-status-filter', label: '成功', value: 'success', desktopValue: 'success', navigation: 'ArrowDown', screenshot: 'phase5-activity-status-filter-open-390.png' },
    { id: 'activity-event-filter', label: '請求事件', value: 'request', desktopValue: 'request', navigation: 'End', screenshot: 'phase5-activity-event-filter-open-390.png' },
  ] as const

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    for (const filter of filters) {
      await page.goto('/activity-logs')
      const nativeFilter = page.getByTestId(filter.id)
      const mobileTrigger = page.getByTestId(`${filter.id}-trigger`)
      const listbox = page.getByTestId(`${filter.id}-options`)

      if (viewport.width <= 640) {
        await expect(nativeFilter).toBeHidden()
        await expect(mobileTrigger).toBeVisible()
        await mobileTrigger.scrollIntoViewIfNeeded()
        await page.getByTestId('activity-page-next').click()
        await expect(page.getByTestId('activity-page-current')).toContainText('第 2 頁')
        await mobileTrigger.focus()
        await page.keyboard.press('Space')
        await expect(listbox).toBeVisible()
        await expect(listbox).toBeFocused()
        await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'true')
        await expect(mobileTrigger).toHaveAttribute('aria-haspopup', 'listbox')
        await expect(listbox).toHaveAttribute('role', 'listbox')
        const geometry = await page.evaluate((id) => {
          const box = (element: Element) => {
            const rect = element.getBoundingClientRect()
            const htmlElement = element as HTMLElement
            return { left: rect.left, right: rect.right, width: rect.width, scrollWidth: htmlElement.scrollWidth }
          }
          const trigger = document.querySelector(`[data-testid="${id}-trigger"]`)!
          const listbox = document.querySelector(`[data-testid="${id}-options"]`)!
          return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, trigger: box(trigger), listbox: box(listbox), options: Array.from(listbox.querySelectorAll('[role="option"]'), box) }
        }, filter.id)
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport)
        expectWithinOnePixel(geometry.listbox.width, geometry.trigger.width)
        for (const rectangle of [geometry.trigger, geometry.listbox, ...geometry.options]) {
          expect(rectangle.left).toBeGreaterThanOrEqual(0)
          expect(rectangle.right).toBeLessThanOrEqual(geometry.viewport)
          expect(rectangle.scrollWidth).toBeLessThanOrEqual(Math.ceil(rectangle.width))
        }
        if (viewport.width === 390) {
          await page.screenshot({ path: resolve(screenshotDirectory, filter.screenshot), fullPage: false })
          if (filter.id === 'activity-model-filter') {
            await page.getByRole('button', { name: '切換為淺色模式' }).click()
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
            await expect(listbox).toHaveCount(0)
            await mobileTrigger.focus()
            await page.keyboard.press('Space')
            await expect(listbox).toBeVisible()
          }
        }
        await page.keyboard.press('Home')
        await expect(listbox).toHaveAttribute('aria-activedescendant', `${filter.id}-option-all`)
        await page.keyboard.press(filter.navigation)
        await expect(listbox).toHaveAttribute('aria-activedescendant', `${filter.id}-option-${filter.value}`)
        await page.keyboard.press('Enter')
        await expect(mobileTrigger).toContainText(filter.label)
        await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false')
        await expect(page.getByTestId('clear-activity-filters')).toBeVisible()
        await expect(page.getByTestId('activity-page-current')).toContainText('第 1 頁')

        if (filter.id === 'activity-model-filter') {
          await expect(page.getByTestId('activity-log-table').locator('tbody tr').first()).toContainText('Neurova Code')
          await page.keyboard.press('Enter')
          await expect(listbox).toBeVisible()
          await page.keyboard.press('Escape')
          await expect(listbox).toHaveCount(0)
          await expect(mobileTrigger).toBeFocused()
          await mobileTrigger.click()
          await expect(listbox).toBeVisible()
          await page.locator('#activity-list-title').click()
          await expect(listbox).toHaveCount(0)
          await mobileTrigger.focus()
          await page.keyboard.press('Space')
          await expect(listbox).toBeVisible()
          await page.keyboard.press('Tab')
          await expect(listbox).toHaveCount(0)
          await expect(page.getByTestId('activity-status-filter-trigger')).toBeFocused()
        }
      } else {
        await expect(mobileTrigger).toBeHidden()
        await expect(nativeFilter).toBeVisible()
        await nativeFilter.focus()
        await page.keyboard.press('ArrowDown')
        await expect(nativeFilter).toHaveValue(filter.desktopValue)
        await page.keyboard.press('Home')
        await expect(nativeFilter).toHaveValue('all')
      }

      await page.reload()
      if (viewport.width <= 640) await expect(mobileTrigger).toContainText(filter.id === 'activity-model-filter' ? '全部模型' : filter.id === 'activity-status-filter' ? '全部狀態' : '全部事件')
      else await expect(nativeFilter).toHaveValue('all')
    }
  }

  expect(consoleErrors).toEqual([])
})

test('user management supports persisted front-end CRUD, accessible dialogs, filters, and responsive controls', async ({ page }) => {
  const consoleErrors = monitorConsole(page)
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/users')
  await page.evaluate(() => localStorage.removeItem('neurova:user-management:v1'))
  await page.reload()

  await expect(page.getByRole('heading', { name: '使用者管理', level: 1 })).toBeVisible()
  await expect(page.getByTestId('users-table')).toBeVisible()
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(10)
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText('72')
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase6-users-desktop-1440.png'), fullPage: true })

  await page.getByTestId('users-search').fill('林雨璇')
  await expect(page.getByTestId('users-pagination-summary')).toContainText('共 3 筆')
  await page.getByTestId('users-role-filter').selectOption('admin')
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(3)
  await page.getByTestId('users-status-filter').selectOption('active')
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(2)
  await page.getByTestId('clear-user-filters').click()
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(10)
  await page.getByTestId('users-page-size').selectOption('20')
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(20)
  await page.getByTestId('users-page-size').selectOption('50')
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(50)
  await page.getByTestId('users-table').getByRole('button', { name: '使用者' }).click()
  await page.getByTestId('users-table').getByRole('button', { name: '加入日期' }).click()

  const createButton = page.getByTestId('open-create-user')
  await createButton.click()
  await expect(page.getByRole('dialog', { name: '新增使用者' })).toBeVisible()
  await expect(page.getByTestId('user-form-name')).toBeFocused()
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase6-users-create-dialog-1440.png'), fullPage: false })
  await page.getByTestId('submit-user-form').click()
  await expect(page.locator('#user-name-error')).toBeVisible()
  await page.getByTestId('user-form-name').fill('  測試新增使用者  ')
  await page.getByTestId('user-form-email').fill('phase6.user@neurova.demo')
  await page.getByTestId('user-form-role').selectOption('editor')
  await page.getByTestId('submit-user-form').click()
  await expect(page.getByTestId('users-toast')).toContainText('已新增')
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText('73')
  await expect(page.getByTestId('users-table').locator('tbody tr').first()).toContainText('測試新增使用者')
  await page.reload()
  await expect(page.getByTestId('users-table').locator('tbody tr').first()).toContainText('測試新增使用者')

  const firstRow = page.getByTestId('users-table').locator('tbody tr').first()
  const editButton = firstRow.getByRole('button', { name: /編輯/ })
  await editButton.click()
  await page.getByTestId('user-form-name').fill('未儲存的名稱')
  await page.getByRole('button', { name: '取消' }).click()
  await expect(page.getByTestId('discard-user-changes')).toBeVisible()
  await page.getByRole('button', { name: '繼續編輯' }).click()
  await page.getByRole('button', { name: '取消' }).click()
  await page.getByTestId('discard-user-changes').click()
  await expect(editButton).toBeFocused()
  await editButton.click()
  await page.getByTestId('user-form-name').fill('已編輯使用者')
  await page.screenshot({ path: resolve(screenshotDirectory, 'phase6-users-edit-dialog-1440.png'), fullPage: false })
  await page.getByTestId('submit-user-form').click()
  await expect(page.getByTestId('users-toast')).toContainText('已更新')
  await expect(firstRow).toContainText('已編輯使用者')

  const statusButton = firstRow.getByRole('button', { name: /停用|啟用/ })
  await statusButton.click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(statusButton).toBeFocused()
  await statusButton.click()
  await page.getByTestId('confirm-user-action').click()
  await expect(page.getByTestId('users-toast')).toContainText(/已停用|已啟用/)

  const deleteButton = firstRow.getByRole('button', { name: /刪除/ })
  await deleteButton.click()
  await page.getByRole('button', { name: '取消' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await deleteButton.click()
  await page.getByTestId('confirm-user-action').click()
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText('72')

  await page.getByTestId('reset-demo-users').click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByTestId('confirm-user-action').click()
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText('72')
  await page.getByRole('button', { name: '切換為淺色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 980 },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await expect(page.getByRole('heading', { name: '使用者管理', level: 1 })).toBeVisible()
    const documentWidth = await page.evaluate(() => ({ viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))
    expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.viewport)
    if (viewport.width === 768) {
      await expect(page.getByTestId('users-table')).toBeHidden()
      await expect(page.getByTestId('users-cards')).toBeVisible()
      continue
    }
    if (viewport.width <= 640) {
      await expect(page.getByTestId('users-table')).toBeHidden()
      await expect(page.getByTestId('users-cards')).toBeVisible()
      const trigger = page.getByTestId('users-role-filter-trigger')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.focus()
      await page.keyboard.press('Space')
      const listbox = page.getByTestId('users-role-filter-options')
      await expect(listbox).toBeVisible()
      const geometry = await page.evaluate(() => {
        const box = (element: Element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width } }
        const trigger = document.querySelector('[data-testid="users-role-filter-trigger"]')!
        const listbox = document.querySelector('[data-testid="users-role-filter-options"]')!
        return { viewport: window.innerWidth, trigger: box(trigger), listbox: box(listbox), scrollWidth: document.documentElement.scrollWidth }
      })
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport)
      expectWithinOnePixel(geometry.trigger.width, geometry.listbox.width)
      for (const rectangle of [geometry.trigger, geometry.listbox]) { expect(rectangle.left).toBeGreaterThanOrEqual(0); expect(rectangle.right).toBeLessThanOrEqual(geometry.viewport) }
      if (viewport.width === 390) await page.screenshot({ path: resolve(screenshotDirectory, 'phase6-users-mobile-390.png'), fullPage: true })
      await page.keyboard.press('Escape')
    } else {
      await expect(page.getByTestId('users-table')).toBeVisible()
      await expect(page.getByTestId('users-role-filter')).toBeVisible()
      await expect(page.getByTestId('users-role-filter-trigger')).toBeHidden()
    }
  }

  expect(consoleErrors).toEqual([])
})
