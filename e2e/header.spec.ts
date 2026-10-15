import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const screenshotDirectory = resolve(process.cwd(), '..', 'output', 'playwright')
mkdirSync(screenshotDirectory, { recursive: true })

async function assertInsideViewport(page: Page, selector: string) {
  const rect = await page.locator(selector).first().evaluate((element) => {
    const { left, right, width } = element.getBoundingClientRect()
    return { left, right, width, viewport: window.innerWidth }
  })
  expect(rect.width).toBeGreaterThan(0)
  expect(rect.left).toBeGreaterThanOrEqual(-1)
  expect(rect.right).toBeLessThanOrEqual(rect.viewport + 1)
}

test('header search navigates by click and keyboard and handles empty results', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/overview')
  await page.getByRole('button', { name: '開啟全站搜尋' }).click()
  const dialog = page.getByRole('dialog', { name: '全站搜尋' })
  await expect(dialog).toBeVisible()
  const input = page.getByRole('combobox', { name: '搜尋頁面與常用入口' })
  await expect(input).toBeFocused()
  await expect(dialog.getByRole('option')).toHaveCount(6)
  await input.fill('沒有的資料項目')
  await expect(dialog.getByText('找不到符合的頁面或功能入口。')).toBeVisible()
  await input.fill('模型比較')
  await expect(dialog.getByRole('option', { name: /模型比較/ })).toBeVisible()
  await input.press('Enter')
  await expect(page).toHaveURL(/\/model-analytics$/)
  await expect(dialog).toBeHidden()
  await page.keyboard.press('Control+k')
  await expect(dialog).toBeVisible()
  await input.fill('活動紀錄')
  await input.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', /search-result-/)
  await input.press('Home')
  await input.press('End')
  await input.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: '開啟全站搜尋' })).toBeFocused()
  await page.keyboard.press('Control+k')
  await input.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: '關閉全站搜尋' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()
  await input.press('ArrowDown')
  await input.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-billing')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/usage-billing$/)
  await page.keyboard.press('Meta+k')
  await expect(dialog).toBeVisible()
  await input.fill('使用者管理')
  await dialog.getByRole('option', { name: /使用者管理/ }).click()
  await expect(page).toHaveURL(/\/users$/)
  expect(errors).toEqual([])
})

test('demo notifications mark read, persist on reload, and navigate', async ({ page }) => {
  await page.goto('/overview')
  await page.evaluate(() => localStorage.removeItem('neurova-demo-notifications-read-v1'))
  await page.reload()
  const trigger = page.getByRole('button', { name: '通知中心，3 則未讀' })
  await trigger.click()
  const panel = page.getByRole('dialog', { name: '示範通知中心' })
  await expect(panel).toBeVisible()
  await expect(panel.getByText('固定示範通知，非即時推播。')).toBeVisible()
  await expect(panel.getByText('3 則未讀')).toBeVisible()
  await panel.getByRole('button', { name: '標記已讀', exact: true }).first().click()
  await expect(panel.getByText('2 則未讀')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: '通知中心，2 則未讀' })).toBeFocused()
  await page.reload()
  await page.getByRole('button', { name: '通知中心，2 則未讀' }).click()
  await panel.getByRole('button', { name: '全部標記已讀' }).click()
  await expect(panel.getByText('0 則未讀')).toBeVisible()
  await panel.getByRole('button', { name: '前往相關頁面' }).nth(1).click()
  await expect(page).toHaveURL(/\/model-analytics$/)
  await page.reload()
  await expect(page.getByRole('button', { name: '通知中心，0 則未讀' })).toBeVisible()
  await page.getByRole('button', { name: '通知中心，0 則未讀' }).click()
  await page.locator('#main-content').click({ position: { x: 8, y: 8 } })
  await expect(panel).toBeHidden()
})

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`header panels stay in viewport at ${width}px in both themes`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/overview')
    await assertInsideViewport(page, '.app-header__search')
    await assertInsideViewport(page, '.app-header__notification-trigger')
    await assertInsideViewport(page, '.app-header__profile-trigger')
    await page.getByRole('button', { name: '開啟全站搜尋' }).click()
    await assertInsideViewport(page, '.global-search__dialog')
    if (width === 1440) await page.screenshot({ path: resolve(screenshotDirectory, 'header-search-desktop-1440.png'), fullPage: false })
    if (width === 390) await page.screenshot({ path: resolve(screenshotDirectory, 'header-search-mobile-390.png'), fullPage: false })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /通知中心，\d+ 則未讀/ }).click()
    await assertInsideViewport(page, '.notification-center')
    await assertInsideViewport(page, '.notification-center__toolbar button')
    if (width === 1440) await page.screenshot({ path: resolve(screenshotDirectory, 'header-notifications-desktop-1440.png'), fullPage: false })
    if (width === 390) await page.screenshot({ path: resolve(screenshotDirectory, 'header-notifications-mobile-390.png'), fullPage: false })
    await page.getByRole('button', { name: '關閉通知中心' }).click()
    await page.getByRole('button', { name: '切換為淺色模式' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: /通知中心，\d+ 則未讀/ }).click()
    await assertInsideViewport(page, '.notification-center')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await assertInsideViewport(page, '.app-header__profile-trigger')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width)
    expect(errors).toEqual([])
  })
}

test('search modal locks background wheel and keyboard scroll while results stay scrollable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 450 })
  await page.goto('/activity-logs')
  await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)).toBeGreaterThan(1200)
  await page.evaluate(() => window.scrollTo(0, 700))
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollingElement: document.scrollingElement?.tagName,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
  }))
  expect(before.scrollingElement).toBe('HTML')
  expect(before.scrollY).toBe(700)
  await page.keyboard.press('Control+k')
  const open = await page.evaluate(() => ({
    scrollY: window.scrollY,
    htmlOverflow: getComputedStyle(document.documentElement).overflowY,
    bodyOverflow: getComputedStyle(document.body).overflowY,
  }))
  expect(open).toEqual({ scrollY: before.scrollY, htmlOverflow: 'hidden', bodyOverflow: 'hidden' })
  await page.mouse.move(200, 250)
  await page.mouse.wheel(0, 400)
  await page.waitForTimeout(200)
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)
  await page.getByRole('button', { name: '關閉全站搜尋' }).focus()
  await page.keyboard.press('PageDown')
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)

  const resultList = page.locator('.global-search__results')
  const dimensions = await resultList.evaluate((element) => ({ client: element.clientHeight, content: element.scrollHeight }))
  expect(dimensions.content).toBeGreaterThan(dimensions.client)
  await resultList.hover()
  await page.mouse.wheel(0, 300)
  await expect.poll(() => resultList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '全站搜尋' })).toBeHidden()
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)

  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: '全站搜尋' })).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)
    if (index % 2 === 0) await page.keyboard.press('Escape')
    else await page.getByRole('button', { name: '關閉全站搜尋' }).click()
    await expect(page.getByRole('dialog', { name: '全站搜尋' })).toBeHidden()
    expect(await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow })))
      .toEqual({ html: before.htmlOverflow, body: before.bodyOverflow })
    expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY)
  }

  await page.mouse.move(200, 250)
  await page.mouse.wheel(0, 300)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.scrollY)
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: '搜尋頁面與常用入口' }).fill('使用者管理')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('dialog', { name: '全站搜尋' })).toBeHidden()
  await page.evaluate(() => window.scrollTo(0, 600))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('390px touch gestures do not scroll through the search modal', async ({ browser }) => {
  test.setTimeout(60_000)
  const context = await browser.newContext({ viewport: { width: 390, height: 450 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  async function swipe(client: CDPSession, x: number, y: number, distance: number) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let step = 1; step <= 10; step += 1) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + distance * step / 10, id: 1 }] })
      await page.waitForTimeout(15)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  try {
    await page.goto('/activity-logs')
    await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)).toBeGreaterThan(1200)
    await page.evaluate(() => window.scrollTo(0, 700))
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(0)
    await page.keyboard.press('Control+k')
    const client = await context.newCDPSession(page)
    await swipe(client, 6, 250, -350)
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
    const resultList = page.locator('.global-search__results')
    const dimensions = await resultList.evaluate((element) => ({ client: element.clientHeight, content: element.scrollHeight }))
    expect(dimensions.content).toBeGreaterThan(dimensions.client)
    const bounds = await resultList.boundingBox()
    expect(bounds).not.toBeNull()
    await swipe(client, Math.round(bounds!.x + bounds!.width / 2), Math.round(bounds!.y + bounds!.height / 2), -220)
    await expect.poll(() => resultList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '全站搜尋' })).toBeHidden()
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
    await swipe(client, 200, 300, -220)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  } finally {
    await context.close().catch(() => undefined)
  }
})
