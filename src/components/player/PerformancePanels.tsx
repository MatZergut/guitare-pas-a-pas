import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { useSettings } from '../../stores/settings'
import { Sheet } from '../Sheet'
import type { PerfPhase, Section } from './usePerformance'

const LENGTHS = [4, 8]

/** Préparation : choix de la section (4 ou 8 mesures), rappel du tempo et de la calibration. */
export function EvaluateSheet({ open, onClose, barCount, defaultSection, tempo, onStart }: {
  open: boolean
  onClose: () => void
  barCount: number
  defaultSection: Section
  tempo: number
  onStart: (s: Section) => void
}) {
  const { latencyMs, timingToleranceMs, set } = useSettings()
  const [from, setFrom] = useState(defaultSection.from)
  const [len, setLen] = useState(Math.min(8, Math.max(4, defaultSection.to - defaultSection.from + 1)))
  const [prevDefault, setPrevDefault] = useState(defaultSection)
  if (prevDefault !== defaultSection) {
    setPrevDefault(defaultSection)
    setFrom(defaultSection.from)
  }
  const to = Math.min(barCount - 1, from + len - 1)

  return (
    <Sheet title="M'évaluer" open={open} onClose={onClose}>
      <p className="mb-4 text-sm text-muted">
        Après le décompte, joue la section avec le métronome. L'appli t'écoute puis te montre tes erreurs sur la tablature.
        Le son reste sur ton téléphone.
      </p>
      <div className="mb-4">
        <p className="mb-2 text-sm text-muted" id="sec-label">Section</p>
        <div className="flex items-center gap-2" role="group" aria-labelledby="sec-label">
          <button type="button" aria-label="Section plus tôt" disabled={from <= 0} onClick={() => setFrom((f) => Math.max(0, f - 1))}
            className="size-12 rounded-xl border border-border text-xl disabled:opacity-40">−</button>
          <output className="flex-1 text-center font-semibold" data-testid="section-label">Mesures {from + 1} à {to + 1}</output>
          <button type="button" aria-label="Section plus tard" disabled={to >= barCount - 1} onClick={() => setFrom((f) => f + 1)}
            className="size-12 rounded-xl border border-border text-xl disabled:opacity-40">+</button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LENGTHS.map((l) => (
            <button key={l} type="button" aria-pressed={len === l} onClick={() => setLen(l)}
              className={`min-h-12 rounded-xl border font-medium ${len === l ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted'}`}>
              {l} mesures
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">Tolérance « en avance / en retard »</span>
        <div className="flex items-center gap-1" role="group" aria-label="Tolérance">
          <button type="button" aria-label="Plus exigeant" disabled={timingToleranceMs <= 40}
            onClick={() => void set('timingToleranceMs', timingToleranceMs - 10)} className="size-12 rounded-xl border border-border disabled:opacity-40">−</button>
          <span className="w-16 text-center font-semibold tabular-nums">{timingToleranceMs} ms</span>
          <button type="button" aria-label="Plus tolérant" disabled={timingToleranceMs >= 150}
            onClick={() => void set('timingToleranceMs', timingToleranceMs + 10)} className="size-12 rounded-xl border border-border disabled:opacity-40">+</button>
        </div>
      </div>
      <p className="mb-4 text-sm">
        Tempo : <strong>{tempo} %</strong> ·{' '}
        {latencyMs === null
          ? <span className="text-warn">téléphone non calibré</span>
          : <span className="text-muted">latence calibrée : {latencyMs} ms</span>}{' '}
        <Link to="/calibration" className="text-accent underline">{latencyMs === null ? 'Calibrer (20 s)' : 'Recalibrer'}</Link>
      </p>
      <button type="button" onClick={() => onStart({ from, to })}
        className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">🎤 Commencer</button>
    </Sheet>
  )
}

/** Bandeau pendant l'enregistrement et l'analyse. */
export function PerformanceBanner({ phase, onStop }: { phase: PerfPhase; onStop: () => void }) {
  if (phase.kind === 'recording') {
    return (
      <div className="flex items-center gap-3 bg-bad/15 px-3 py-2" role="status" data-testid="recording-banner">
        <span className="size-3 animate-pulse rounded-full bg-bad" aria-hidden="true" />
        <p className="flex-1 text-sm font-medium">Enregistrement — joue avec le métronome (mesures {phase.section.from + 1} à {phase.section.to + 1})</p>
        <button type="button" onClick={onStop} className="min-h-12 rounded-xl border border-border px-3 text-sm">Arrêter</button>
      </div>
    )
  }
  if (phase.kind === 'analyzing') {
    const pct = phase.stage === 'model' ? 0 : Math.round(phase.pct * 100)
    return (
      <div className="px-3 py-2" role="status" data-testid="analyzing-banner">
        <p className="mb-1 text-sm font-medium">{phase.stage === 'model' ? 'Préparation de l’analyse…' : `Analyse de ton jeu… ${pct} %`}</p>
        <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} /></div>
      </div>
    )
  }
  return null
}

/** Résultat : score, erreurs principales, historique, entraînement ciblé. */
export function ResultSheet({ phase, songId, onPractice, onRetry, onClose }: {
  phase: PerfPhase
  songId: string
  onPractice: (bar: number) => void
  onRetry: () => void
  onClose: () => void
}) {
  const history = useLiveQuery(() => db.performances.where('[songId+playedAt]').between([songId, 0], [songId, Infinity]).reverse().limit(6).toArray(), [songId], [])

  if (phase.kind === 'error') {
    return (
      <Sheet title="Oups" open onClose={onClose}>
        <p role="alert" className="mb-4">{phase.message}</p>
        <button type="button" onClick={onRetry} className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">Réessayer</button>
      </Sheet>
    )
  }
  if (phase.kind !== 'result') return null
  const { result } = phase
  const tone = result.score >= 80 ? 'text-ok' : result.score >= 50 ? 'text-warn' : 'text-bad'
  const previous = history.slice(1)

  return (
    <div className="max-h-[50dvh] overflow-y-auto border-t border-border bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]" data-testid="result-panel">
      <div className="mb-2 flex items-center gap-4">
        <p className={`text-5xl font-bold tabular-nums ${tone}`} data-testid="perf-score">{result.score}</p>
        <div className="flex-1">
          <p className="font-semibold">{result.score >= 90 ? 'Excellent !' : result.score >= 70 ? 'Bien joué !' : result.score >= 40 ? 'Continue, ça vient !' : 'On va travailler ça ensemble'}</p>
          {previous.length > 0 && <p className="text-xs text-muted">Avant : {previous.map((h) => h.score).join(' · ')}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le résultat" className="size-12 text-2xl text-muted">✕</button>
      </div>
      <p className="mb-2 flex gap-3 text-xs text-muted" aria-hidden="true">
        <span><span className="text-ok">●</span> juste</span><span><span className="text-warn">●</span> décalée</span><span><span className="text-bad">●</span> fausse ou oubliée</span>
      </p>
      {result.mistakes.length > 0 ? (
        <ol className="mb-3 flex flex-col gap-1" aria-label="Erreurs principales" data-testid="mistakes">
          {result.mistakes.map((m) => <li key={m.kind} className="rounded-xl bg-bg px-3 py-2 text-sm">{m.label}</li>)}
        </ol>
      ) : (
        <p className="mb-3 text-sm">Aucune erreur, bravo !</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {result.weakestBar !== null && (
          <button type="button" onClick={() => onPractice(result.weakestBar!)}
            className="col-span-2 min-h-14 rounded-xl bg-accent text-lg font-semibold text-bg">
            Travailler la mesure {result.weakestBar + 1} (au ralenti)
          </button>
        )}
        <button type="button" onClick={onRetry} className="min-h-12 rounded-xl border border-border font-medium">Recommencer</button>
        <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-border font-medium text-muted">Fermer</button>
      </div>
    </div>
  )
}

export function CalibratedSheet({ phase, onClose }: { phase: PerfPhase; onClose: () => void }) {
  if (phase.kind !== 'calibrated') return null
  return (
    <Sheet title="Calibration terminée" open onClose={onClose}>
      <p className="mb-2 text-5xl font-bold text-ok" data-testid="latency-value">{phase.latencyMs} ms</p>
      <p className="mb-4 text-muted">C'est le délai entre le métronome et ce que le micro entend sur ce téléphone. Il sera compensé dans tes analyses.</p>
      <Link to="/morceaux" className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-bg">Retour aux morceaux</Link>
    </Sheet>
  )
}
