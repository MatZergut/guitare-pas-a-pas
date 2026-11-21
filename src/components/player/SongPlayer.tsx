import { synth } from '@coderline/alphatab'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { usePracticeTimer } from '../../app/usePracticeTimer'
import { useWakeLock } from '../../app/useWakeLock'
import { clampTempo, loopLabel, tapBar, TEMPO_MAX, TEMPO_MIN, TEMPO_STEP, type LoopSelection } from '../../lib/songs/loop'
import { barTickRange } from '../../lib/songs/score'
import { CalibratedSheet, EvaluateSheet, PerformanceBanner, ResultSheet } from './PerformancePanels'
import { useAlphaTab, type SongSource } from './useAlphaTab'
import { usePerformance, type Section } from './usePerformance'

interface Props {
  songId: string
  title: string
  subtitle?: string
  source: SongSource
  /** Mode calibration : un seul bouton, qui mesure la latence de l'appareil. */
  calibration?: boolean
}

export function SongPlayer({ songId, title, subtitle, source, calibration = false }: Props) {
  const navigate = useNavigate()
  const host = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const { api, info } = useAlphaTab(host, scroller, source)
  const [tempo, setTempo] = useState(100)
  const [metronome, setMetronome] = useState(calibration)
  const [countIn, setCountIn] = useState(true)
  const [loopMode, setLoopMode] = useState(false)
  const [loop, setLoop] = useState<LoopSelection | null>(null)
  const [evaluateOpen, setEvaluateOpen] = useState(false)
  const lastSection = useRef<Section | null>(null)

  // Applique les réglages de lecture choisis (aussi après un enregistrement).
  const applyPlayback = useCallback(() => {
    const a = api.current
    if (!a) return
    a.playbackSpeed = tempo / 100
    a.metronomeVolume = metronome ? 1 : 0
    a.countInVolume = countIn ? 1 : 0
    if (!info.score) return
    if (loop && loopMode) {
      const { startTick, endTick } = barTickRange(info.score, loop.a, loop.b)
      const range = new synth.PlaybackRange()
      range.startTick = startTick
      range.endTick = endTick
      a.playbackRange = range
      a.isLooping = true
      const bars = info.score.tracks[info.trackIndex].staves[0].bars
      const lastBeats = bars[loop.b].voices[0].beats
      a.highlightPlaybackRange(bars[loop.a].voices[0].beats[0], lastBeats[lastBeats.length - 1])
      a.tickPosition = startTick
    } else {
      a.playbackRange = null
      a.isLooping = false
      a.clearPlaybackRangeHighlight()
    }
  }, [api, tempo, metronome, countIn, loop, loopMode, info.score, info.trackIndex])
  useEffect(applyPlayback, [applyPlayback])

  const perf = usePerformance({ api, score: info.score, trackIndex: info.trackIndex, songId, tempo, restorePlayback: applyPlayback })
  const busy = perf.phase.kind === 'recording' || perf.phase.kind === 'analyzing'
  useWakeLock(info.playing || busy)
  usePracticeTimer(!calibration && (info.playing || busy))

  // Boucle A–B : toucher une mesure en mode boucle
  const loopModeRef = useRef(loopMode)
  loopModeRef.current = loopMode
  useEffect(() => {
    const a = api.current
    if (!a) return
    const handler = (beat: { voice: { bar: { index: number } } }) => {
      if (loopModeRef.current) setLoop((s) => tapBar(s, beat.voice.bar.index))
    }
    a.beatMouseDown.on(handler as never)
    return () => a.beatMouseDown.off(handler as never)
  }, [api, info.score])

  const barCount = info.score?.masterBars.length ?? 0
  const selectTrack = (i: number) => {
    if (!info.score || !api.current) return
    setLoop(null)
    api.current.renderTracks([info.score.tracks[i]])
  }

  const startSection = (s: Section) => {
    setEvaluateOpen(false)
    lastSection.current = s
    if (info.playing) api.current?.stop()
    void perf.start(s, calibration ? 'calibration' : 'analysis')
  }

  // « Travailler cette mesure » : boucle sur la mesure la plus faible, ralentie.
  const practice = (bar: number) => {
    perf.close()
    setTempo((t) => clampTempo(Math.max(TEMPO_MIN, t * 0.75)))
    setLoopMode(true)
    setLoop({ a: bar, b: bar, complete: true })
    setTimeout(() => api.current?.play(), 300)
  }

  const defaultSection: Section = loop && loopMode
    ? { from: loop.a, to: loop.b }
    : { from: info.currentBar, to: Math.min(barCount - 1, info.currentBar + 7) }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)] short:hidden">
        <button type="button" aria-label="Retour aux morceaux" onClick={() => navigate('/morceaux')}
          className="flex size-12 shrink-0 items-center justify-center text-2xl text-muted">✕</button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold" data-testid="song-title">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {info.tracks.length > 1 && !calibration && (
          <select aria-label="Piste" value={info.trackIndex} onChange={(e) => selectTrack(Number(e.target.value))}
            className="min-h-12 max-w-32 rounded-xl border border-border bg-surface px-2 text-sm">
            {info.tracks.map((t) => <option key={t.index} value={t.index}>{t.name || `Piste ${t.index + 1}`}</option>)}
          </select>
        )}
        {!calibration && (
          <button type="button" onClick={() => setEvaluateOpen(true)} disabled={!info.ready || busy}
            className="min-h-12 shrink-0 rounded-xl border border-accent px-3 text-sm font-semibold text-accent disabled:opacity-40">
            🎤 M'évaluer
          </button>
        )}
      </header>

      {calibration && perf.phase.kind === 'idle' && (
        <div className="mx-3 mb-2 rounded-2xl border border-border bg-surface p-3 text-sm">
          <p className="mb-2">Après le décompte, joue la <strong>corde de La à vide</strong> exactement sur chaque clic du métronome (16 fois). Ça prend 20 secondes.</p>
          <button type="button" disabled={!info.ready} onClick={() => startSection({ from: 0, to: barCount - 1 })}
            className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg disabled:opacity-40">
            {info.ready ? '🎤 Lancer la calibration' : 'Chargement…'}
          </button>
        </div>
      )}

      <PerformanceBanner phase={perf.phase} onStop={perf.stop} />

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" data-testid="tab-scroller">
        {info.error && <p role="alert" className="m-4 rounded-xl border border-bad/50 p-4">Ce morceau n'a pas pu être affiché. {info.error}</p>}
        <div ref={host} className="tab-host" data-testid="tab-host" />
      </div>

      {perf.phase.kind === 'result' ? (
        <ResultSheet phase={perf.phase} songId={songId} onPractice={practice} onClose={perf.close}
          onRetry={() => lastSection.current && startSection(lastSection.current)} />
      ) : (
        !calibration && (
          <footer className="border-t border-border bg-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] short:py-1">
            {loopMode && (
              <p className="mb-1 text-center text-sm text-accent" aria-live="polite" data-testid="loop-label">
                {loop ? `Boucle : ${loopLabel(loop)}${loop.complete ? '' : ' — touche une autre mesure pour l’étendre'}` : 'Touche une mesure pour la jouer en boucle'}
              </p>
            )}
            <div className="short:flex short:items-center short:gap-3">
              <div className="flex items-center gap-2 short:flex-1 short:gap-3">
                <button type="button" onClick={() => api.current?.playPause()} disabled={!info.ready || busy}
                  aria-label={info.playing ? 'Pause' : 'Lecture'}
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-2xl text-bg disabled:opacity-40">
                  {info.playing ? '❚❚' : '▶'}
                </button>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="tabular-nums" data-testid="bar-position">{barCount ? `Mesure ${info.currentBar + 1} / ${barCount}` : 'Chargement…'}</p>
                  {!info.ready && <p className="text-xs text-muted">Chargement des sons… {Math.round(info.loadProgress * 100)} %</p>}
                </div>
                <div className="flex items-center" role="group" aria-label="Tempo">
                  <button type="button" aria-label="Ralentir" disabled={tempo <= TEMPO_MIN || busy}
                    onClick={() => setTempo((t) => clampTempo(t - TEMPO_STEP))}
                    className="size-12 rounded-xl border border-border text-xl disabled:opacity-40">−</button>
                  <output className="w-16 text-center font-semibold tabular-nums" aria-label="Tempo">{tempo} %</output>
                  <button type="button" aria-label="Accélérer" disabled={tempo >= TEMPO_MAX || busy}
                    onClick={() => setTempo((t) => clampTempo(t + TEMPO_STEP))}
                    className="size-12 rounded-xl border border-border text-xl disabled:opacity-40">+</button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 short:mt-0 short:w-[46%]">
                <Toggle on={metronome} onClick={() => setMetronome((v) => !v)}>Métronome</Toggle>
                <Toggle on={countIn} onClick={() => setCountIn((v) => !v)}>Décompte</Toggle>
                <Toggle on={loopMode} onClick={() => { setLoopMode((v) => !v); setLoop(null) }}>Boucle A–B</Toggle>
              </div>
            </div>
          </footer>
        )
      )}

      {barCount > 0 && (
        <EvaluateSheet open={evaluateOpen} onClose={() => setEvaluateOpen(false)} barCount={barCount}
          defaultSection={defaultSection} tempo={tempo} onStart={startSection} />
      )}
      {perf.phase.kind === 'error' && (
        <ResultSheet phase={perf.phase} songId={songId} onPractice={practice} onClose={perf.close}
          onRetry={() => { perf.close(); if (lastSection.current) startSection(lastSection.current) }} />
      )}
      <CalibratedSheet phase={perf.phase} onClose={perf.close} />
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-12 rounded-xl border text-sm font-medium ${on ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted'}`}>
      {children}
    </button>
  )
}
