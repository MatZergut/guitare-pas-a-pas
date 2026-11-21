import { chromium, devices, expect, test, type Page } from '@playwright/test'
import { writeGuitarWav } from './wav'

/** Lance Chrome avec un faux micro qui joue `freq` en boucle. */
async function openTunerWithFakeMic(freq: number, grant: boolean) {
  const wav = writeGuitarWav(`tone-${freq.toFixed(2)}.wav`, freq)
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`],
  })
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:4173', locale: 'fr-FR' })
  if (grant) await context.grantPermissions(['microphone'])
  const page = await context.newPage()
  await page.goto('/accorder')
  return { browser, page }
}

async function tapIfAsked(page: Page) {
  const tap = page.getByRole('button', { name: 'Touche l’écran pour lancer l’écoute' })
  if (await tap.isVisible().catch(() => false)) await tap.click()
}

test.describe('accordeur avec faux micro', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')

  test('La2 juste : démarrage automatique, « Parfait ! » en vert', async () => {
    const { browser, page } = await openTunerWithFakeMic(110, true)
    await expect(page.getByRole('button', { name: 'Autoriser le micro' })).toHaveCount(0)
    await tapIfAsked(page)
    await expect(page.getByTestId('tuner-note')).toHaveText('La(A)', { timeout: 10_000 })
    await expect(page.getByTestId('tuner-instruction')).toHaveText('Parfait !')
    await expect(page.getByTestId('tuner-display')).toHaveAttribute('data-status', 'ok')
    // validée après ~1 s juste
    await expect(page.getByRole('button', { name: /5e corde : La \(A\), accordée/ })).toBeVisible()
    await browser.close()
  })

  test('Ré3 trop haut de 20 cents : consigne « desserre »', async () => {
    const { browser, page } = await openTunerWithFakeMic(146.83 * 2 ** (20 / 1200), true)
    await tapIfAsked(page)
    await expect(page.getByTestId('tuner-note')).toHaveText('Ré(D)', { timeout: 10_000 })
    await expect(page.getByTestId('tuner-instruction')).toHaveText(/desserre/)
    const cents = await page.getByTestId('tuner-cents').textContent()
    expect(Number(cents!.match(/\d+/)![0])).toBeGreaterThanOrEqual(18)
    expect(Number(cents!.match(/\d+/)![0])).toBeLessThanOrEqual(22)
    await browser.close()
  })

  test('première visite : explication puis autorisation', async () => {
    const { browser, page } = await openTunerWithFakeMic(196, false)
    await page.getByRole('button', { name: 'Autoriser le micro' }).click()
    await tapIfAsked(page)
    await expect(page.getByTestId('tuner-note')).toHaveText('Sol(G)', { timeout: 10_000 })
    await browser.close()
  })
})
