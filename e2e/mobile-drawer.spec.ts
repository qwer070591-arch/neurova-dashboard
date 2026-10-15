import { expect, test, type CDPSession, type Page } from '@playwright/test'

function monitorErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function expectDrawerFocus(page: Page) {
  expect(await page.evaluate(() => {
    const drawer = document.querySelector('.sidebar')
    return !!drawer && drawer.contains(document.activeElement)
  })).toBe(true)
}

test('mobile drawer is modal, keyboard-contained, scroll-locked, and restores focus at every breakpoint', async ({ page }) => {
  const errors = monitorErrors(page)

  for (const width of [320, 375, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 720 })
    await page.goto('/activity-logs')
    await page.evaluate(() => window.scrollTo(0, 500))
    const beforeScroll = await page.evaluate(() => window.scrollY)
    const trigger = page.getByRole('button', { name: '開啟導覽選單' })
    await trigger.click()

    const drawer = page.getByRole('dialog', { name: '主要導覽' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: '關閉導覽選單' })).toBeFocused()
    await expectDrawerFocus(page)
    await expect(page.locator('.app-shell__workspace')).toHaveAttribute('inert', '')
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')

    await drawer.getByRole('link', { name: /NEUROVA/ }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(drawer.locator('.sidebar__collapse-button')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(drawer.getByRole('link', { name: /NEUROVA/ })).toBeFocused()
    await expectDrawerFocus(page)

    await page.mouse.move(width - 2, 450)
    await page.mouse.wheel(0, 450)
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll)
    await page.keyboard.press('PageDown')
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('')
    await expect(page.locator('.app-shell__workspace')).not.toHaveAttribute('inert', '')
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll)

    await trigger.click()
    await expect(drawer).toBeVisible()
    await page.mouse.click(width - 2, 120)
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await drawer.getByRole('link', { name: '模型分析' }).click()
    await expect(page).toHaveURL(/\/model-analytics$/)
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

    await page.reload()
    await trigger.click()
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar')).not.toHaveAttribute('role', 'dialog')
  await expect(page.getByRole('button', { name: '開啟導覽選單' })).toBeHidden()
  expect(errors).toEqual([])
})

test('touch gestures scroll inside the drawer without moving the background', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 320 }, isMobile: true, hasTouch: true })
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
    await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)).toBeGreaterThan(1000)
    await page.evaluate(() => window.scrollTo(0, 500))
    const before = await page.evaluate(() => window.scrollY)
    await page.getByRole('button', { name: '開啟導覽選單' }).click()
    const client = await context.newCDPSession(page)
    await swipe(client, 385, 220, -180)
    expect(await page.evaluate(() => window.scrollY)).toBe(before)

    const nav = page.locator('.sidebar__nav')
    const rect = await nav.boundingBox()
    expect(rect).not.toBeNull()
    await swipe(client, Math.round(rect!.x + rect!.width / 2), Math.round(rect!.y + rect!.height / 2), -150)
    await expect.poll(() => nav.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(before)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '開啟導覽選單' })).toBeFocused()
    await swipe(client, 385, 220, -180)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  } finally {
    await context.close()
  }
})

test('drawer navigation scrolls independently and repeated opens leave no focus or scroll lock residue', async ({ page }) => {
  const errors = monitorErrors(page)
  await page.setViewportSize({ width: 390, height: 320 })
  await page.goto('/activity-logs')
  const trigger = page.getByRole('button', { name: '開啟導覽選單' })
  const drawer = page.getByRole('dialog', { name: '主要導覽' })

  for (let index = 0; index < 5; index += 1) {
    await trigger.click()
    await expect(drawer).toBeVisible()
    await expectDrawerFocus(page)
    const nav = drawer.locator('.sidebar__nav')
    const size = await nav.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight }))
    expect(size.scroll).toBeGreaterThan(size.client)
    await nav.evaluate((element) => { element.scrollTop = element.scrollHeight })
    expect(await nav.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  }

  await trigger.click()
  await page.keyboard.press('Control+k')
  await expect(drawer).toBeHidden()
  const search = page.getByRole('dialog', { name: '全站搜尋' })
  await expect(search).toBeVisible()
  await expect(search.getByRole('combobox')).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(search).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')

  await page.getByRole('button', { name: /通知中心/ }).click()
  await expect(page.getByRole('dialog', { name: '示範通知中心' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '示範通知中心' })).toBeHidden()
  expect(errors).toEqual([])
})
