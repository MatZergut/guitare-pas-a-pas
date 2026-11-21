import type { LessonProgress } from '../../db/db'
import type { Lesson } from './types'

/** Taux de réussite pour débloquer la leçon suivante. */
export const UNLOCK_SCORE = 0.8

export type LessonState = 'done' | 'available' | 'locked'

export function lessonStates(lessons: Lesson[], progress: ReadonlyMap<string, LessonProgress>): LessonState[] {
  return lessons.map((l, i) => {
    if ((progress.get(l.id)?.bestScore ?? 0) >= UNLOCK_SCORE) return 'done'
    if (i === 0) return 'available'
    const prev = progress.get(lessons[i - 1].id)
    return (prev?.bestScore ?? 0) >= UNLOCK_SCORE ? 'available' : 'locked'
  })
}

/** Fusionne un nouveau résultat avec la progression enregistrée (on garde le meilleur). */
export function mergeResult(prev: LessonProgress | undefined, lessonId: string, score: number, bestStreak: number, now: number): LessonProgress {
  const bestScore = Math.max(prev?.bestScore ?? 0, score)
  return {
    lessonId,
    bestScore,
    attempts: (prev?.attempts ?? 0) + 1,
    bestStreak: Math.max(prev?.bestStreak ?? 0, bestStreak),
    completedAt: prev?.completedAt ?? (score >= UNLOCK_SCORE ? now : undefined),
    updatedAt: now,
  }
}
