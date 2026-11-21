import { Link } from 'react-router'
import { UNLOCK_SCORE } from '../../lib/lessons/progress'
import type { Lesson } from '../../lib/lessons/types'

interface Props {
  lesson: Lesson
  score: number
  bestStreak: number
  next?: Lesson
  onRetry: () => void
}

export function LessonResult({ lesson, score, bestStreak, next, onRetry }: Props) {
  const pct = Math.round(score * 100)
  const passed = score >= UNLOCK_SCORE
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" data-testid="lesson-result">
      <p className={`text-7xl font-bold ${passed ? 'text-ok' : 'text-warn'}`}>{pct} %</p>
      <h2 className="text-2xl font-bold">{passed ? 'Leçon réussie !' : 'Encore un petit effort'}</h2>
      <p className="max-w-xs text-muted">
        {passed
          ? next ? `« ${next.title} » est débloquée.` : 'Tu as terminé tout le parcours. Bravo !'
          : `Il faut ${Math.round(UNLOCK_SCORE * 100)} % pour débloquer la leçon suivante. Recommence quand tu veux : seul ton meilleur score compte.`}
      </p>
      {bestStreak >= 2 && <p className="text-sm text-muted">Meilleure série : {bestStreak} bonnes réponses d'affilée</p>}
      <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
        {passed && next && (
          <Link to={`/apprendre/${next.id}`} replace className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-bg">
            Leçon suivante
          </Link>
        )}
        <button type="button" onClick={onRetry}
          className={`min-h-14 rounded-xl text-lg font-semibold ${passed ? 'border border-border' : 'bg-accent text-bg'}`}>
          Recommencer « {lesson.title} »
        </button>
        <Link to="/apprendre" className="flex min-h-12 items-center justify-center text-muted">Retour aux leçons</Link>
      </div>
    </div>
  )
}
