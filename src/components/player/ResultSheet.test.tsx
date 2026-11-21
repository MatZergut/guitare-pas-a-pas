import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { analyzePerformance } from '../../lib/analysis/align'
import { ResultSheet } from './PerformancePanels'

const expected = [60, 62, 64, 65, 67, 65, 64, 62].map((pitch, i) => ({ id: i, pitch, time: 1 + i * 0.5, bar: Math.floor(i / 4) }))
const played = expected.map((n, i) => ({ pitch: i === 5 ? n.pitch + 1 : n.pitch, onset: n.time + (i === 6 ? 0.15 : 0), duration: 0.4, amplitude: 0.7 }))

describe('ResultSheet', () => {
  beforeEach(async () => {
    await db.performances.clear()
    await db.performances.bulkAdd([
      { songId: 's', score: 55, tempoPercent: 70, topErrors: [], playedAt: 1 },
      { songId: 's', score: 81, tempoPercent: 70, topErrors: [], playedAt: 2 },
    ])
  })

  it('affiche score, erreurs, historique et l’entraînement sur la mesure la plus faible', async () => {
    const result = analyzePerformance(expected, played)
    const onPractice = vi.fn()
    render(<MemoryRouter><ResultSheet phase={{ kind: 'result', section: { from: 0, to: 1 }, result, tempo: 70 }} songId="s"
      onPractice={onPractice} onRetry={() => {}} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByTestId('perf-score')).toHaveTextContent(String(result.score))
    expect(screen.getByTestId('mistakes')).toHaveTextContent('1 fausse note (en général 1 demi-ton trop haut)')
    expect(screen.getByTestId('mistakes')).toHaveTextContent('1 note en retard (150 ms en moyenne)')
    expect(await screen.findByText('Avant : 55')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Travailler la mesure 2 (au ralenti)' }))
    expect(onPractice).toHaveBeenCalledWith(1)
  })

  it('message d’erreur clair avec « Réessayer »', () => {
    const onRetry = vi.fn()
    render(<MemoryRouter><ResultSheet phase={{ kind: 'error', message: 'Le micro est bloqué.' }} songId="s"
      onPractice={() => {}} onRetry={onRetry} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('Le micro est bloqué.')
  })
})
