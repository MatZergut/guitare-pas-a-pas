import { describe, expect, it } from 'vitest'
import type { LessonProgress } from '../../db/db'
import { lessonStates, mergeResult } from './progress'
import type { Lesson } from './types'

const L = (id: string): Lesson => ({ id, title: id, summary: '', minutes: 3, steps: [] })
const lessons = [L('a'), L('b'), L('c')]
const prog = (entries: [string, number][]) =>
  new Map(entries.map(([id, s]) => [id, { lessonId: id, bestScore: s, attempts: 1, updatedAt: 0 } as LessonProgress]))

describe('lessonStates', () => {
  it('seule la première est ouverte au départ', () => {
    expect(lessonStates(lessons, new Map())).toEqual(['available', 'locked', 'locked'])
  })
  it('80 % débloquent la suivante, 79 % non', () => {
    expect(lessonStates(lessons, prog([['a', 0.8]]))).toEqual(['done', 'available', 'locked'])
    expect(lessonStates(lessons, prog([['a', 0.79]]))).toEqual(['available', 'locked', 'locked'])
  })
})

describe('mergeResult', () => {
  it('garde le meilleur score et compte les essais', () => {
    const a = mergeResult(undefined, 'a', 0.5, 2, 100)
    expect(a).toMatchObject({ bestScore: 0.5, attempts: 1, bestStreak: 2, completedAt: undefined })
    const b = mergeResult(a, 'a', 0.9, 1, 200)
    expect(b).toMatchObject({ bestScore: 0.9, attempts: 2, bestStreak: 2, completedAt: 200 })
    const c = mergeResult(b, 'a', 0.3, 5, 300)
    expect(c).toMatchObject({ bestScore: 0.9, attempts: 3, bestStreak: 5, completedAt: 200 })
  })
})
