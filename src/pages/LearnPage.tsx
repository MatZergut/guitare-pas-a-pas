import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { Page } from '../components/Page'
import { LESSONS } from '../content/lessons'
import { db } from '../db/db'
import { lessonStates, type LessonState } from '../lib/lessons/progress'

const BADGE: Record<LessonState, string> = {
  done: 'bg-ok text-bg',
  available: 'bg-accent text-bg',
  locked: 'bg-border text-muted',
}

export default function LearnPage() {
  const rows = useLiveQuery(() => db.lessonProgress.toArray(), [])
  const progress = new Map((rows ?? []).map((p) => [p.lessonId, p]))
  const states = lessonStates(LESSONS, progress)
  const doneCount = states.filter((s) => s === 'done').length

  return (
    <Page title="Apprendre" action={<span className="text-sm text-muted">{doneCount}/{LESSONS.length} leçons</span>}>
      <ol className="flex flex-col gap-3" aria-label="Parcours des leçons">
        {LESSONS.map((l, i) => {
          const state = states[i]
          const best = progress.get(l.id)?.bestScore
          const inner = (
            <>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold ${BADGE[state]}`} aria-hidden="true">
                {state === 'done' ? '✓' : state === 'locked' ? '🔒' : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-sm text-muted">{l.summary}</span>
                <span className="mt-1 block text-xs text-muted">
                  {l.minutes} min
                  {best !== undefined && ` · meilleur score ${Math.round(best * 100)} %`}
                  {state === 'locked' && ' · 80 % à la leçon précédente pour débloquer'}
                </span>
              </span>
            </>
          )
          const cls = `flex min-h-16 items-center gap-3 rounded-2xl border p-3 ${
            state === 'available' ? 'border-accent bg-accent/10' : 'border-border bg-surface'
          }`
          return (
            <li key={l.id} data-state={state} data-testid={`lesson-${l.id}`}>
              {state === 'locked' ? (
                <div className={`${cls} opacity-60`} aria-disabled="true">{inner}</div>
              ) : (
                <Link to={`/apprendre/${l.id}`} className={`${cls} active:bg-border/60`}>{inner}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </Page>
  )
}
