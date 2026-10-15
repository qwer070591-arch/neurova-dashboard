import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const screenshots = resolve(process.cwd(), '..', 'output', 'playwright')
mkdirSync(screenshots, { recursive: true })

async function freshSettings(page: Page) {
  await page.goto('/settings')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: '系統設定', exact: true })).toBeVisible()
}

async function withinViewport(page: Page, selector: string) {
  const bounds = await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden'
  }).map((element) => {
    const { left, right, width } = element.getBoundingClientRect()
    return { left, right, width, viewport: innerWidth }
  }))
  expect(bounds.length).toBeGreaterThan(0)
  for (const bound of bounds) {
    expect(bound.width).toBeGreaterThan(0)
    expect(bound.left).toBeGreaterThanOrEqual(-1)
    expect(bound.right).toBeLessThanOrEqual(bound.viewport + 1)
  }
}

test('display name validates, updates Header, and persists after F5', async ({ page }) => {
  await freshSettings(page)
  const name = page.getByRole('textbox', { name: '顯示名稱' })
  await name.fill('   ')
  await page.getByRole('button', { name: '儲存名稱' }).click()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#settings-name-error')).toBeVisible()
  await expect(name).toBeFocused()
  await name.fill('  林管理員  ')
  await page.getByRole('button', { name: '儲存名稱' }).click()
  await expect(page.locator('.app-header__profile-copy strong')).toHaveText('林管理員')
  await page.reload()
  await expect(name).toHaveValue('林管理員')
  await expect(page.locator('.app-header__profile-copy strong')).toHaveText('林管理員')
})

test('theme follows system and stays synchronized with Header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'light' })
  await freshSettings(page)
  await page.getByRole('radio', { name: /淺色模式/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('radio', { name: /跟隨系統/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.getByRole('radio', { name: /跟隨系統/ })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('.app-header__icon-button').filter({ has: page.locator('svg') }).last().click()
  await expect(page.getByRole('radio', { name: /淺色模式/ })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.sidebar__nav-link--active')).toHaveCSS('color', 'rgb(16, 24, 40)')
  await page.screenshot({ path: resolve(screenshots, 'phase7-settings-light-1440.png'), fullPage: true })
})

test('notification categories filter visible items while preserving read state', async ({ page }) => {
  await freshSettings(page)
  const bell = page.locator('.app-header__notification-trigger')
  await expect(bell).toHaveAttribute('aria-label', '通知中心，3 則未讀')
  await bell.click()
  const panel = page.getByRole('dialog', { name: '示範通知中心' })
  await panel.getByRole('button', { name: '標記已讀', exact: true }).first().click()
  await expect(bell).toHaveAttribute('aria-label', '通知中心，2 則未讀')
  await page.keyboard.press('Escape')
  await page.getByRole('switch', { name: '使用量與費用' }).uncheck()
  await expect(bell).toHaveAttribute('aria-label', '通知中心，2 則未讀')
  await bell.click()
  await expect(panel.getByText('使用量摘要可供查看')).toHaveCount(0)
  await expect(panel.getByText('模型比較資料已備妥')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('switch', { name: '分析與活動' }).uncheck()
  await expect(bell).toHaveAttribute('aria-label', '通知中心，0 則未讀')
  await bell.click()
  await expect(panel.getByText('目前沒有啟用的示範通知類別。可至系統設定重新啟用。')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('switch', { name: '使用量與費用' })).not.toBeChecked()
  await expect(page.getByRole('switch', { name: '分析與活動' })).not.toBeChecked()
  await page.getByRole('switch', { name: '使用量與費用' }).check()
  await expect(bell).toHaveAttribute('aria-label', '通知中心，0 則未讀')
  await bell.click()
  await expect(panel.getByText('使用量摘要可供查看')).toBeVisible()
  await expect(panel.getByText('已讀', { exact: true })).toBeVisible()
})

test('reduced motion persists and all data actions require confirmation', async ({ page }) => {
  await freshSettings(page)
  await page.getByRole('switch', { name: '減少動畫效果' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  await page.reload()
  await expect(page.getByRole('switch', { name: '減少動畫效果' })).toBeChecked()
  const clear = page.getByRole('button', { name: '清除已讀', exact: true })
  await clear.click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden')
  const lockedScrollY = await page.evaluate(() => window.scrollY)
  await page.mouse.move(4, 450)
  await page.mouse.wheel(0, 500)
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScrollY)
  await expect(dialog.getByRole('button', { name: '關閉確認視窗' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByTestId('confirm-user-action')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(clear).toBeFocused()
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden')
  await clear.click()
  await dialog.getByTestId('confirm-user-action').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('status')).toContainText('示範通知已讀狀態已清除')

  await page.getByRole('textbox', { name: '顯示名稱' }).fill('新名稱')
  await page.getByRole('button', { name: '儲存名稱' }).click()
  await page.getByRole('radio', { name: /淺色模式/ }).check()
  await page.getByRole('switch', { name: '使用量與費用' }).uncheck()
  const resetSettings = page.getByRole('button', { name: '重設設定', exact: true })
  await resetSettings.click()
  await dialog.getByTestId('confirm-user-action').click()
  await expect(page.getByRole('textbox', { name: '顯示名稱' })).toHaveValue('示範管理員')
  await expect(page.getByRole('radio', { name: /深色模式/ })).toBeChecked()
  await expect(page.getByRole('switch', { name: '使用量與費用' })).toBeChecked()
  await expect(page.getByRole('switch', { name: '減少動畫效果' })).not.toBeChecked()
  await expect(page.locator('.app-header__profile-copy strong')).toHaveText('示範管理員')

  await page.goto('/users')
  const before = await page.getByTestId('users-kpi-total').locator('strong').innerText()
  await page.getByTestId('open-create-user').click()
  const form = page.getByRole('dialog')
  await form.getByRole('textbox', { name: '姓名' }).fill('設定重設測試')
  await form.getByTestId('user-form-email').fill('settings-reset@example.test')
  await form.getByTestId('submit-user-form').click()
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText(String(Number(before) + 1))
  await page.goto('/settings')
  await page.getByRole('button', { name: '重設使用者', exact: true }).click()
  await expect(dialog).toContainText('不涉及真實帳號')
  await dialog.getByTestId('confirm-user-action').click()
  await page.goto('/users')
  await expect(page.getByTestId('users-kpi-total').locator('strong')).toHaveText(before)
})

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`settings remain usable at ${width}px before and after reload`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize({ width, height: 900 })
    await freshSettings(page)
    for (const heading of ['個人偏好', '外觀設定', '通知偏好', '使用體驗', '示範資料管理', '系統資訊']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }
    for (let iteration = 0; iteration < 2; iteration += 1) {
      await withinViewport(page, '.settings-card')
      await withinViewport(page, '.settings-card__header h2')
      await withinViewport(page, '.settings-toggle-row input')
      await withinViewport(page, '.settings-data-actions button')
      await withinViewport(page, '.app-header__profile-trigger')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (iteration === 0) await page.reload()
    }
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: resolve(screenshots, `phase7-settings-dark-${width}.png`), fullPage: true })
    }
    if (width === 390) {
      await page.getByRole('button', { name: '重設設定', exact: true }).click()
      await withinViewport(page, '.user-confirm')
      await page.screenshot({ path: resolve(screenshots, 'phase7-settings-confirm-390.png'), fullPage: false })
      await page.keyboard.press('Escape')
    }
    expect(errors).toEqual([])
  })
}
