import { expect, test } from '@playwright/test'

test('barre d’onglets : navigation entre les 4 modules', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/accorder$/)
  for (const [label, path] of [['Apprendre', 'apprendre'], ['Morceaux', 'morceaux'], ['Progrès', 'progres'], ['Accorder', 'accorder']]) {
    await page.getByRole('link', { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`/${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label)
  }
})

test('cibles tactiles ≥ 48 px et pas de défilement horizontal', async ({ page }) => {
  await page.goto('/')
  for (const link of await page.getByRole('navigation').getByRole('link').all()) {
    const box = (await link.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(48)
    expect(box.width).toBeGreaterThanOrEqual(48)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('accès direct à une route (rechargement sur /morceaux)', async ({ page }) => {
  await page.goto('/morceaux')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Morceaux')
})
