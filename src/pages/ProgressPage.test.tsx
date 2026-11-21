import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { dayKey } from '../lib/progress/stats'
import ProgressPage from './ProgressPage'

const renderPage = () => render(<MemoryRouter><ProgressPage /></MemoryRouter>)
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d) }

describe('ProgressPage', () => {
  beforeEach(async () => {
    await Promise.all([db.lessonProgress.clear(), db.practice.clear(), db.performances.clear(), db.songs.clear()])
  })

  it('vide : invite à commencer', async () => {
    renderPage()
    expect(await screen.findByText('0 / 9 terminées')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Prochaine : Tenir la guitare/ })).toBeInTheDocument()
    expect(screen.getByText(/Évalue-toi sur un morceau/)).toBeInTheDocument()
    expect(screen.getByTestId('streak')).toHaveTextContent('0')
  })

  it('leçons, série, temps de la semaine et courbe d’un morceau', async () => {
    await db.lessonProgress.bulkPut([
      { lessonId: 'tenir-la-guitare', bestScore: 1, attempts: 1, updatedAt: 1 },
      { lessonId: 'cordes-a-vide', bestScore: 0.85, attempts: 2, updatedAt: 2 },
    ])
    await db.practice.bulkPut([{ day: daysAgo(0), seconds: 600 }, { day: daysAgo(1), seconds: 900 }, { day: daysAgo(2), seconds: 300 }])
    await db.performances.bulkAdd([
      { songId: 'frere-jacques', score: 55, tempoPercent: 70, topErrors: [], playedAt: Date.now() - 2000 },
      { songId: 'frere-jacques', score: 82, tempoPercent: 70, topErrors: [], playedAt: Date.now() - 1000 },
    ])
    renderPage()
    expect(await screen.findByText('2 / 9 terminées')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Prochaine : Les cases/ })).toBeInTheDocument()
    await expect.poll(() => screen.getByTestId('streak').textContent).toContain('3')
    expect(screen.getByTestId('week-total')).toHaveTextContent('30 min')
    const song = within(screen.getByTestId('songs-card')).getByRole('button', { name: /Frère Jacques/ })
    expect(song).toHaveTextContent('82')
    expect(song).toHaveTextContent('2 essais · meilleur 82')
    await userEvent.click(song)
    expect(screen.getByRole('img', { name: 'Frère Jacques : scores successifs 55, 82' })).toBeInTheDocument()
  })

  it('restauration : refuse un fichier qui n’est pas une sauvegarde', async () => {
    renderPage()
    const file = new File(['{"hello":1}'], 'x.json', { type: 'application/json' })
    await userEvent.upload(screen.getByTestId('restore-input'), file)
    expect(await screen.findByRole('status')).toHaveTextContent('pas une sauvegarde')
  })
})
