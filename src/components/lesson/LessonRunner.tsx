import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { playReference } from '../../audio/referenceTone'
import { useMicrophone } from '../../audio/useMicrophone'
import { usePracticeTimer } from '../../app/usePracticeTimer'
import { useWakeLock } from '../../app/useWakeLock'
import { db } from '../../db/db'
import { hintFor, type MatchEvent } from '../../lib/lessons/matcher'
import { positionNote, stringLabel } from '../../lib/lessons/positions'
import { mergeResult } from '../../lib/lessons/progress'
import { buildRun, initialRunState, runReducer, runScore, type RunItem, type RunState } from '../../lib/lessons/run'
import type { Lesson } from '../../lib/lessons/types'
import { formatNote, midiToNoteName } from '../../lib/music/notes'
import { useSettings } from '../../stores/settings'
import { Fretboard, type Mark } from '../Fretboard'
import { MicGate } from '../MicGate'
import { LessonResult } from './LessonResult'
import { useNoteListener } from './useNoteListener'

const AUTO_NEXT_MS = 900

interface Props {
  lesson: Lesson
  next?: Lesson
  /** Graine des questions (fixée dans les tests). */
  seed?: number
}

export function LessonRunner({ lesson, next, seed }: Props) {
  const [attempt, setAttempt] = useState(0)
  const items = useMemo(() => buildRun(lesson, (seed ?? Date.now()) + attempt), [lesson, seed, attempt])
  return <Run key={attempt} lesson={lesson} next={next} items={items} onRetry={() => setAttempt((a) => a + 1)} />
}

function Run({ lesson, next, items, onRetry }: { lesson: Lesson; next?: Lesson; items: RunItem[]; onRetry: () => void }) {
  const navigate = useNavigate()
  const a4Hz = useSettings((s) => s.a4Hz)
  const [state, dispatch] = useReducer((s: RunState, a: Parameters<typeof runReducer>[2]) => runReducer(items, s, a), items.length, initialRunState)
  const [message, setMessage] = useState<string | null>(null)
  const item = items[state.index]
  const listening = !state.done && state.phase === 'asking' && (item.kind === 'play' || item.kind === 'find')

  const itemRef = useRef(item)
  itemRef.current = item

  const onEvent = useCallback((e: MatchEvent) => {
    const current = itemRef.current
    if (current.kind === 'info') return
    if (e.type === 'match') {
      dispatch({ type: 'correct' })
      setMessage(null)
      navigator.vibrate?.(30)
    } else if (e.type === 'wrong') {
      dispatch({ type: 'wrong' })
      setMessage(`Tu joues ${formatNote(midiToNoteName(e.heardMidi))}. ${hintFor(e.heardMidi, current.midi)}`)
    } else {
      const c = Math.round(e.cents)
      setMessage(`C'est la bonne note, mais elle sonne ${c < 0 ? 'trop bas' : 'trop haut'} (${c > 0 ? '+' : '−'}${Math.abs(c)} cents). Pense à accorder ta guitare.`)
    }
  }, [])

  const ear = useNoteListener(a4Hz, onEvent)
  const mic = useMicrophone(ear.onFrame)
  useWakeLock(!state.done)
  usePracticeTimer(!state.done)

  // Cible du micro : seulement quand on attend une note jouée.
  const targetMidi = listening && (item.kind === 'play' || item.kind === 'find') ? item.midi : null
  const { setTarget } = ear
  useEffect(() => setTarget(targetMidi), [targetMidi, state.index, setTarget])

  useEffect(() => setMessage(null), [state.index])

  // Bonne réponse : on passe tout seul à la suite. Sinon, bouton « Suivant ».
  const manualNext = state.skipped || (item?.kind === 'name' && state.wrongPc !== null)
  useEffect(() => {
    if (state.phase !== 'feedback' || manualNext) return
    const t = setTimeout(() => dispatch({ type: 'next' }), AUTO_NEXT_MS)
    return () => clearTimeout(t)
  }, [state.phase, state.index, manualNext])

  // Fin : enregistrement de la progression (une seule fois).
  const score = runScore(items, state)
  const saved = useRef(false)
  useEffect(() => {
    if (!state.done || saved.current) return
    saved.current = true
    void db.transaction('rw', db.lessonProgress, async () => {
      const prev = await db.lessonProgress.get(lesson.id)
      await db.lessonProgress.put(mergeResult(prev, lesson.id, score, state.bestStreak, Date.now()))
    })
  }, [state.done, score, state.bestStreak, lesson.id])

  const listen = async () => {
    if (item.kind === 'info') return
    const ms = await playReference(item.midi, a4Hz)
    ear.muteFor(ms + 300)
  }

  const progress = state.done ? 1 : state.index / items.length

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/apprendre')} aria-label="Quitter la leçon"
          className="flex size-12 items-center justify-center text-2xl text-muted">✕</button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border" role="progressbar"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Avancement">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`min-w-12 text-right text-sm font-semibold ${state.streak >= 2 ? 'text-accent' : 'text-transparent'}`} aria-live="polite">
          {state.streak >= 2 ? `🔥 ${state.streak}` : ''}
        </span>
      </header>

      {state.done ? (
        <LessonResult lesson={lesson} score={score} bestStreak={state.bestStreak} next={next} onRetry={onRetry} />
      ) : (
        <ItemView item={item} state={state} message={message} heard={ear.heard ? formatNote(ear.heard) : null}
          micGate={<MicGate compact status={mic.status} onStart={() => void mic.start()} />} micOk={mic.status === 'listening'}
          onNext={() => dispatch({ type: 'next' })} onSkip={() => dispatch({ type: 'skip' })}
          onChoose={(pc) => dispatch(pc === (item.kind === 'info' ? -1 : item.midi % 12) ? { type: 'correct' } : { type: 'wrong', pc })}
          onListen={() => void listen()} />
      )}
    </div>
  )
}

interface ItemViewProps {
  item: RunItem
  state: RunState
  message: string | null
  heard: string | null
  micGate: React.ReactNode
  micOk: boolean
  onNext: () => void
  onSkip: () => void
  onChoose: (pc: number) => void
  onListen: () => void
}

function ItemView({ item, state, message, heard, micGate, micOk, onNext, onSkip, onChoose, onListen }: ItemViewProps) {
  const feedback = state.phase === 'feedback'
  const result = state.results[state.index]

  if (item.kind === 'info') {
    const marks: Mark[] = (item.step.show ?? []).map((p) => ({ position: p, tone: 'info', label: positionNote(p).fr }))
    return (
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <h2 className="text-2xl font-bold">{item.step.title}</h2>
        <div className="flex flex-col gap-3 text-lg leading-relaxed">
          {item.step.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {marks.length > 0 && (
          <Fretboard frets={item.step.frets ?? (Math.max(...marks.map((m) => m.position.fret)) <= 5 ? 5 : 12)} marks={marks} />
        )}
        <div className="mt-auto pt-4">
          <button type="button" onClick={onNext} className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">Continuer</button>
        </div>
      </div>
    )
  }

  const note = positionNote(item.position)
  // Corde à vide : le nom de la corde EST la réponse, on le cache tant qu'on n'a pas répondu.
  const openQuiz = item.kind !== 'play' && item.position.fret === 0 && !feedback
  const name = formatNote(note)
  const where = `${stringLabel(item.position.string)}${item.position.fret === 0 ? ', à vide' : `, case ${item.position.fret}`}`

  // Ce qu'on montre sur le manche selon le jeu et l'état.
  const marks: Mark[] = []
  if (item.kind === 'play') {
    marks.push({ position: item.position, tone: feedback ? (result === 'ok' ? 'ok' : 'target') : 'target', label: note.fr })
  } else if (item.kind === 'find') {
    if (feedback) marks.push({ position: item.position, tone: result === 'ok' ? 'ok' : 'target', label: note.fr })
  } else {
    marks.push({ position: item.position, tone: feedback ? (result === 'ok' ? 'ok' : 'bad') : 'target', label: feedback ? note.fr : undefined })
  }

  const feedbackText = !feedback
    ? null
    : state.skipped
      ? `C'était ${name} : ${where}.`
      : result === 'ok'
        ? 'Bravo !'
        : item.kind === 'name'
          ? `Non, c'est ${name}.`
          : 'Trouvé ! (après un essai raté)'

  return (
    <div className="flex flex-1 flex-col gap-3 pt-3">
      <div>
        {item.kind !== 'name' && <p className="text-sm text-muted">{item.title}</p>}
        {item.kind === 'play' && (
          <h2 className="text-2xl font-bold" data-testid="prompt">Joue {name}</h2>
        )}
        {item.kind === 'find' && (
          <h2 className="text-2xl font-bold" data-testid="prompt">Trouve {name}</h2>
        )}
        {item.kind === 'name' && (
          <h2 className="text-2xl font-bold" data-testid="prompt">Quelle est cette note ?</h2>
        )}
        <p className="text-muted">
          {item.kind === 'play'
            ? where
            : item.kind === 'find'
              ? openQuiz ? 'Joue la bonne corde, à vide' : `sur la ${stringLabel(item.position.string)}`
              : item.text}
        </p>
      </div>

      <Fretboard frets={item.frets} marks={marks}
        highlightString={item.kind === 'find' && !openQuiz ? item.position.string : undefined}
        hideStringNames={openQuiz}
        description={openQuiz || (item.kind === 'name' && !feedback) ? 'Manche : une note est indiquée' : `Manche : ${where}`} />

      <div className="min-h-16" aria-live="polite">
        {feedbackText ? (
          <p className={`text-center text-xl font-bold ${result === 'ok' ? 'text-ok' : 'text-warn'}`} data-testid="feedback">{feedbackText}</p>
        ) : item.kind !== 'name' && !micOk ? (
          micGate
        ) : (
          <>
            {message && <p className="text-center font-medium text-warn" data-testid="hint">{message}</p>}
            {item.kind !== 'name' && (
              <p className="mt-1 text-center text-sm text-muted" data-testid="heard">{heard ? `J'entends : ${heard}` : "J'écoute…"}</p>
            )}
          </>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {item.kind === 'name' && (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Réponses">
            {item.choices.map((c) => {
              const isRight = c.pc === item.midi % 12
              const tone = !feedback ? 'border-border bg-surface' : isRight ? 'border-ok bg-ok/20' : c.pc === state.wrongPc ? 'border-bad bg-bad/20' : 'border-border opacity-50'
              return (
                <button key={c.pc} type="button" disabled={feedback} onClick={() => onChoose(c.pc)}
                  className={`min-h-14 rounded-xl border text-lg font-semibold ${tone}`}>
                  {c.fr} ({c.en})
                </button>
              )
            })}
          </div>
        )}
        {feedback && (state.skipped || (item.kind === 'name' && state.wrongPc !== null)) ? (
          <button type="button" onClick={onNext} className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">Suivant</button>
        ) : (
          item.kind !== 'name' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onListen} disabled={feedback}
                className="min-h-14 rounded-xl border border-border text-lg font-semibold disabled:opacity-40">🔊 Écouter</button>
              <button type="button" onClick={onSkip} disabled={feedback}
                className="min-h-14 rounded-xl border border-border text-lg text-muted disabled:opacity-40">
                {item.kind === 'find' ? 'Je ne trouve pas' : 'Passer'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
