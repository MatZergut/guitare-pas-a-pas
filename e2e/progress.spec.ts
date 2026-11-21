import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const today = new Date()
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yesterday = new Date(today.getTime() - 86_400_000)

const TEX = `\\title "Mon morceau sauvegardé"\n.\n\\track "Guitare"\n\\staff {tabs}\n\\ts 4 4\n0.1.4 1.1.4 3.1.4 0.1.4`
const backup = {
  format: 'guitare-pas-a-pas', version: 1, exportedAt: Date.now(),
  lessonProgress: [{ lessonId: 'tenir-la-guitare', bestScore: 1, attempts: 1, updatedAt: 1 }],
  performances: [
    { songId: 'au-clair-de-la-lune', score: 48, tempoPercent: 70, topErrors: [], playedAt: Date.now() - 5000 },
    { songId: 'au-clair-de-la-lune', score: 77, tempoPercent: 70, topErrors: [], playedAt: Date.now() - 1000 },
  ],
  practice: [{ day: key(today), seconds: 1200 }, { day: key(yesterday), seconds: 600 }],
  settings: [{ key: 'a4Hz', value: 442 }, { key: 'latencyMs', value: 999 }],
  songs: [{ id: 'import:abc', title: 'Mon morceau sauvegardé', fileName: 'mon.tex', format: 'alphatex', importedAt: 1, level: 1, dataBase64: Buffer.from(TEX).toString('base64') }],
}

test('sauvegarde → nouveau téléphone → restauration', async ({ page, browser }) => {
  await page.goto('/progres')
  await page.getByTestId('restore-input').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  const confirm = page.getByRole('alertdialog', { name: 'Confirmer la restauration' })
  await expect(confirm).toContainText('1 leçon réussie, 2 scores, 1 morceau importé')
  await confirm.getByRole('button', { name: 'Restaurer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Progression restaurée' })).toBeVisible()
  await expect(page.getByText('1 / 9 terminées')).toBeVisible()
  await expect(page.getByTestId('streak')).toContainText('2')
  await expect(page.getByTestId('week-total')).toContainText('30 min')
  await expect(page.getByTestId('songs-card')).toContainText('77')

  // Export
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sauvegarder' }).click()])
  expect(download.suggestedFilename()).toMatch(/^guitare-pas-a-pas-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/)
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(exported.settings.find((s: { key: string }) => s.key === 'latencyMs')).toBeUndefined() // propre à l'appareil
  expect(exported.songs[0].dataBase64).toBe(backup.songs[0].dataBase64)

  // « Nouveau téléphone » : contexte vierge
  const fresh = await (await browser.newContext({ baseURL: 'http://localhost:4173' })).newPage()
  await fresh.goto('/progres')
  await expect(fresh.getByText('0 / 9 terminées')).toBeVisible()
  await fresh.getByTestId('restore-input').setInputFiles((await download.path())!)
  await fresh.getByRole('alertdialog').getByRole('button', { name: 'Restaurer' }).click()
  await expect(fresh.getByText('1 / 9 terminées')).toBeVisible()
  await fresh.goto('/morceaux')
  await fresh.getByRole('link', { name: /Mon morceau sauvegardé/ }).click()
  await expect(fresh.getByTestId('tab-host').locator('svg').first()).toBeVisible({ timeout: 15_000 })
  await fresh.goto('/accorder')
  await expect(fresh.getByRole('button', { name: /Réglages : Standard · La 442 Hz/ })).toBeVisible()
})
