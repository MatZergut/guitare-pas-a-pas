import { chromium, devices, expect, test, type Page } from '@playwright/test'
import { writeGuitarWav } from './wav'

/** Faux micro : un La grave pincé à chaque temps à 80 bpm (0,75 s). */
async function withFakeMic(fn: (page: Page) => Promise<void>) {
  const wav = writeGuitarWav('pluck-A2-80bpm.wav', 110, 6, 48000, { plucked: true, period: 0.75 })
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
  })
  const ctx = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:4173', locale: 'fr-FR' })
  await ctx.grantPermissions(['microphone'])
  const page = await ctx.newPage()
  page.on('console', (m) => { if (/transcri|backend|error/i.test(m.text())) console.log('[page]', m.text()) })
  try { await fn(page) } finally { await browser.close() }
}

test.describe('analyse de jeu', () => {
  test.setTimeout(180_000)

  test('calibration : mesure et enregistre la latence', async () => {
    await withFakeMic(async (page) => {
      await page.goto('/calibration')
      const go = page.getByRole('button', { name: '🎤 Lancer la calibration' })
      await expect(go).toBeEnabled({ timeout: 30_000 })
      await go.click()
      await expect(page.getByTestId('recording-banner')).toBeVisible()
      await expect(page.getByTestId('analyzing-banner')).toBeVisible({ timeout: 30_000 })
      const t0 = Date.now()
      await expect(page.getByTestId('latency-value')).toBeVisible({ timeout: 120_000 })
      console.log('calibration : analyse en', Date.now() - t0, 'ms ; latence', await page.getByTestId('latency-value').textContent())
      await expect(page.getByTestId('latency-value')).toHaveText(/^-?\d+ ms$/)
    })
  })

  test('évaluation d’une section : enregistrement, analyse, score et notes colorées', async () => {
    await withFakeMic(async (page) => {
      await page.goto('/morceaux/au-clair-de-la-lune')
      const evalBtn = page.getByRole('button', { name: "🎤 M'évaluer" })
      await expect(evalBtn).toBeEnabled({ timeout: 30_000 })
      await evalBtn.click()
      const sheet = page.getByRole('dialog', { name: "M'évaluer" })
      await expect(sheet.getByTestId('section-label')).toHaveText('Mesures 1 à 8')
      await sheet.getByRole('button', { name: '4 mesures' }).click()
      await expect(sheet.getByTestId('section-label')).toHaveText('Mesures 1 à 4')
      await sheet.getByRole('button', { name: '🎤 Commencer' }).click()
      await expect(page.getByTestId('recording-banner')).toBeVisible()
      await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 150_000 })
      const score = Number(await page.getByTestId('perf-score').textContent())
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
      // Le faux micro ne joue que des La : la mélodie (Do Ré Mi…) est donc fausse → erreurs listées.
      await expect(page.getByTestId('mistakes')).toBeVisible()
      // Notes colorées sur la tablature (rouge = fausse ou oubliée)
      const fills = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid=tab-host] svg *')]
        .map((el) => (el.getAttribute('fill') ?? '') + '|' + ((el as SVGElement).style?.fill ?? '')).filter((f) => f !== '|'))])
      console.log('couleurs SVG :', fills.slice(0, 12).join('  '))
      const red = fills.filter((f) => /ef4444|239,\s*68,\s*68/i.test(f))
      expect(red.length).toBeGreaterThan(0)
      // Entraînement ciblé : boucle ralentie sur la mesure la plus faible
      await page.getByRole('button', { name: /Travailler la mesure \d/ }).click()
      await expect(page.getByTestId('loop-label')).toHaveText(/Boucle : Mesure \d/)
      await expect(page.getByLabel('Tempo', { exact: true }).last()).toHaveText('75 %')
    })
  })
})
