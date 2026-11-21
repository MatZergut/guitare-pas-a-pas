import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import LearnPage from './LearnPage'

const renderPage = () => render(<MemoryRouter><LearnPage /></MemoryRouter>)

describe('LearnPage', () => {
  beforeEach(async () => { await db.lessonProgress.clear() })

  it('au départ, seule la première leçon est ouverte', async () => {
    renderPage()
    expect(await screen.findByTestId('lesson-tenir-la-guitare')).toHaveAttribute('data-state', 'available')
    expect(screen.getByTestId('lesson-cordes-a-vide')).toHaveAttribute('data-state', 'locked')
    expect(within(screen.getByTestId('lesson-cordes-a-vide')).queryByRole('link')).toBeNull()
  })

  it('80 % à une leçon débloquent la suivante et affichent le meilleur score', async () => {
    await db.lessonProgress.put({ lessonId: 'tenir-la-guitare', bestScore: 0.8, attempts: 1, updatedAt: 1 })
    renderPage()
    expect(await screen.findByText(/meilleur score 80 %/)).toBeInTheDocument()
    expect(screen.getByTestId('lesson-tenir-la-guitare')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('lesson-cordes-a-vide')).toHaveAttribute('data-state', 'available')
    expect(screen.getByText('1/9 leçons')).toBeInTheDocument()
  })
})
