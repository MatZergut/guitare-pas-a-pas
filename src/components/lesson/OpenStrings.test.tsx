import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Lesson } from '../../lib/lessons/types'
import { LessonRunner } from './LessonRunner'

const lesson = (type: 'name' | 'find', frets: [number, number]): Lesson => ({
  id: 't', title: 't', summary: '', minutes: 3,
  steps: [{ type, title: 'Q', pool: { strings: [6, 5, 4, 3, 2, 1], frets }, rounds: 2 }],
})
const renderL = (l: Lesson) => render(<MemoryRouter><LessonRunner lesson={l} seed={1} /></MemoryRouter>)

describe('questions sur les cordes à vide', () => {
  it('« Quelle est cette note ? » cache le nom des cordes, puis le montre après la réponse', async () => {
    renderL(lesson('name', [0, 0]))
    expect(screen.queryAllByTestId('string-name')).toHaveLength(0)
    await userEvent.click(screen.getByRole('group', { name: 'Réponses' }).querySelector('button')!)
    expect(screen.getAllByTestId('string-name')).toHaveLength(6)
  })

  it('« Trouve la corde » ne surligne pas la corde et ne la nomme pas', () => {
    renderL(lesson('find', [0, 0]))
    expect(screen.queryAllByTestId('string-name')).toHaveLength(0)
    expect(screen.getByText('Joue la bonne corde, à vide')).toBeInTheDocument()
    expect(screen.queryByText(/sur la corde de/)).toBeNull()
  })

  it('sur une case, le nom des cordes reste affiché (point de repère)', () => {
    renderL(lesson('name', [1, 12]))
    expect(screen.getAllByTestId('string-name')).toHaveLength(6)
  })
})
