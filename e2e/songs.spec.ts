import { expect, test } from '@playwright/test'

const MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Mon essai importé</work-title></work>
  <part-list><score-part id="P1"><part-name>Guitare</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`

test('bibliothèque classée par niveau', async ({ page }) => {
  await page.goto('/morceaux')
  for (let l = 1; l <= 5; l++) await expect(page.getByRole('heading', { name: new RegExp(`^Niveau ${l}`) })).toBeVisible()
  await expect(page.getByRole('region', { name: /Niveau 1/ }).getByRole('link')).toHaveCount(2)
})

test('lecture d’un morceau : tablature affichée, curseur qui avance', async ({ page }) => {
  await page.goto('/morceaux')
  await page.getByRole('link', { name: /Au clair de la lune/ }).click()
  await expect(page.getByTestId('song-title')).toHaveText('Au clair de la lune')
  await expect(page.getByTestId('tab-host').locator('svg').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('bar-position')).toHaveText('Mesure 1 / 16')
  const play = page.getByRole('button', { name: 'Lecture' })
  await expect(play).toBeEnabled({ timeout: 20_000 }) // banque de sons chargée
  await page.getByRole('button', { name: 'Décompte' }).click() // sans décompte pour aller plus vite
  await expect(page.getByRole('button', { name: 'Accélérer' })).toBeDisabled() // déjà à 100 %
  await play.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByTestId('bar-position')).toHaveText(/Mesure [2-9] \/ 16/, { timeout: 8_000 })
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Lecture' })).toBeVisible()
})

test('tempo 50 à 100 % et boucle A–B sur une mesure', async ({ page }) => {
  await page.goto('/morceaux/frere-jacques')
  await expect(page.getByTestId('tab-host').locator('svg').first()).toBeVisible({ timeout: 15_000 })
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Ralentir' }).click({ force: true })
  await expect(page.getByLabel('Tempo', { exact: true }).last()).toHaveText('50 %')
  await expect(page.getByRole('button', { name: 'Ralentir' })).toBeDisabled()
  await page.getByRole('button', { name: 'Boucle A–B' }).click()
  await expect(page.getByTestId('loop-label')).toHaveText('Touche une mesure pour la jouer en boucle')
  // Toucher une note de la tablature
  const box = (await page.getByTestId('tab-host').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.3, box.y + 60)
  await expect(page.getByTestId('loop-label')).toHaveText(/Boucle : Mesure \d+/)
})

test('import d’un fichier MusicXML', async ({ page }) => {
  await page.goto('/morceaux')
  await page.getByTestId('import-input').setInputFiles({ name: 'essai.musicxml', mimeType: 'application/xml', buffer: Buffer.from(MUSICXML) })
  const dialog = page.getByRole('dialog', { name: 'Ajouter un morceau' })
  await expect(dialog.getByRole('textbox')).toHaveValue('Mon essai importé')
  await dialog.getByRole('button', { name: /Niveau 1/ }).click()
  await dialog.getByRole('button', { name: 'Ajouter à mes morceaux' }).click()
  const row = page.getByRole('region', { name: /Niveau 1/ }).getByRole('link', { name: /Mon essai importé/ })
  await expect(row).toContainText('Importé')
  await row.click()
  await expect(page.getByTestId('tab-host').locator('svg').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('bar-position')).toHaveText('Mesure 1 / 1')
  // Supprimer
  await page.goto('/morceaux')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Supprimer Mon essai importé' }).click()
  await expect(page.getByRole('link', { name: /Mon essai importé/ })).toHaveCount(0)
})

test('fichier non reconnu : message clair', async ({ page }) => {
  await page.goto('/morceaux')
  await page.getByTestId('import-input').setInputFiles({ name: 'photo.gp5', mimeType: 'application/octet-stream', buffer: Buffer.from('pas une tablature') })
  await expect(page.getByRole('alert')).toContainText('Ce fichier n’a pas pu être lu')
})

test('paysage : tablature et commandes visibles, sans défilement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 412 })
  await page.goto('/morceaux/greensleeves')
  await expect(page.getByTestId('tab-host').locator('svg').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('song-title')).toBeHidden() // en-tête masqué pour gagner de la place
  await expect(page.getByRole('button', { name: 'Lecture' })).toBeInViewport()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
