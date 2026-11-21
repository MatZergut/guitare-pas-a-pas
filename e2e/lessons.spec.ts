import { chromium, devices, expect, test } from '@playwright/test'
import { writeGuitarWav } from './wav'

test.describe('leçons', () => {
  test('parcours : la 1re leçon est ouverte, les autres verrouillées', async ({ page }) => {
    await page.goto('/apprendre')
    await expect(page.getByTestId('lesson-tenir-la-guitare')).toHaveAttribute('data-state', 'available')
    await expect(page.getByTestId('lesson-cordes-a-vide')).toHaveAttribute('data-state', 'locked')
  })

  test('« Quitter » ramène au parcours', async ({ page }) => {
    await page.goto('/apprendre')
    await page.getByRole('link', { name: /Tenir la guitare/ }).click()
    await expect(page.getByRole('navigation')).toHaveCount(0) // plein écran
    await page.getByRole('button', { name: 'Quitter la leçon' }).click()
    await expect(page).toHaveURL(/\/apprendre$/)
  })

  test('1re leçon réussie en jouant le Mi grave → la 2e se débloque', async () => {
    const wav = writeGuitarWav('pluck-E2.wav', 82.41, 6, 48000, { plucked: true })
    const browser = await chromium.launch({
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`],
    })
    const ctx = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:4173', locale: 'fr-FR' })
    await ctx.grantPermissions(['microphone'])
    const page = await ctx.newPage()
    await page.goto('/apprendre/tenir-la-guitare')
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page.getByTestId('prompt')).toHaveText('Joue Mi (E)')
    const tap = page.getByRole('button', { name: 'Touche l’écran pour lancer l’écoute' })
    if (await tap.isVisible().catch(() => false)) await tap.click()
    await expect(page.getByTestId('lesson-result')).toContainText('100 %', { timeout: 15_000 })
    await page.getByRole('link', { name: 'Leçon suivante' }).click()
    await expect(page.getByRole('heading', { name: 'Mi La Ré Sol Si Mi' })).toBeVisible()
    await page.goto('/apprendre')
    await expect(page.getByTestId('lesson-tenir-la-guitare')).toHaveAttribute('data-state', 'done')
    await expect(page.getByTestId('lesson-cordes-a-vide')).toHaveAttribute('data-state', 'available')
    await browser.close()
  })
})
