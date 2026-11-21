import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { buildRun } from '../../lib/lessons/run'
import type { Lesson } from '../../lib/lessons/types'
import { LessonRunner } from './LessonRunner'

const lesson: Lesson = {
  id: 'quiz-test', title: 'Quiz', summary: '', minutes: 3,
  steps: [
    { type: 'info', title: 'Bienvenue', paragraphs: ['Petit quiz.'] },
    { type: 'name', title: 'Quelle note ?', pool: { strings: [6], frets: [0, 12], naturalOnly: true }, rounds: 3 },
  ],
}
const SEED = 5
const answers = buildRun(lesson, SEED).filter((i) => i.kind === 'name').map((i) => (i.kind === 'name' ? i : null)!)

const renderRunner = () =>
  render(<MemoryRouter><LessonRunner lesson={lesson} seed={SEED} /></MemoryRouter>)


describe('LessonRunner — « Quelle est cette note ? »', () => {
  beforeEach(async () => { await db.lessonProgress.clear() })

  it('bonne réponse : « Bravo ! » puis question suivante automatiquement', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(screen.getByTestId('prompt')).toHaveTextContent('Quelle est cette note ?')
    const right = answers[0].choices.find((c) => c.pc === answers[0].midi % 12)!
    await user.click(screen.getByRole('button', { name: `${right.fr} (${right.en})` }))
    expect(screen.getByTestId('feedback')).toHaveTextContent('Bravo !')
  })

  it('mauvaise réponse : montre la bonne note et attend « Suivant »', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    const wrong = answers[0].choices.find((c) => c.pc !== answers[0].midi % 12)!
    await user.click(screen.getByRole('button', { name: `${wrong.fr} (${wrong.en})` }))
    expect(screen.getByTestId('feedback')).toHaveTextContent(/^Non, c'est/)
    expect(screen.getByRole('button', { name: `${wrong.fr} (${wrong.en})` })).toHaveClass('border-bad')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeInTheDocument()
  })

  it('termine la leçon, affiche le score et l’enregistre', async () => {
    const user = userEvent.setup({ delay: null })
    renderRunner()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    for (const q of answers) {
      const right = q.choices.find((c) => c.pc === q.midi % 12)!
      await user.click(screen.getByRole('button', { name: `${right.fr} (${right.en})` }))
      await act(() => new Promise((r) => setTimeout(r, 950))) // passage automatique
    }
    expect(await screen.findByTestId('lesson-result')).toHaveTextContent('100 %')
    expect(screen.getByText('Leçon réussie !')).toBeInTheDocument()
    await expect.poll(() => db.lessonProgress.get('quiz-test')).toMatchObject({ bestScore: 1, attempts: 1, bestStreak: 3 })
  }, 10_000)
})
