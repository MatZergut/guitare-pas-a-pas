import { synth } from '@coderline/alphatab'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useWakeLock } from '../../app/useWakeLock'
import { clampTempo, loopLabel, tapBar, TEMPO_MAX, TEMPO_MIN, TEMPO_STEP, type LoopSelection } from '../../lib/songs/loop'
import { barTickRange } from '../../lib/songs/score'
import { useAlphaTab, type SongSource } from './useAlphaTab'

interface Props {
  title: string
  subtitle?: string
  source: SongSource
}

export function SongPlayer({ title, subtitle, source }: Props) {
  const navigate = useNavigate()
  const host = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const { api, info } = useAlphaTab(host, scroller, source)
  const [tempo, setTempo] = useState(100)
  const [metronome, setMetronome] = useState(false)
  const [countIn, setCountIn] = useState(true)
  const [loopMode, setLoopMode] = useState(false)
  const [loop, setLoop] = useState<LoopSelection | null>(null)
  useWakeLock(info.playing)

  // Réglages → alphaTab
  useEffect(() => { if (api.current) api.current.playbackSpeed = tempo / 100 }, [api, tempo])
  useEffect(() => { if (api.current) api.current.metronomeVolume = metronome ? 1 : 0 }, [api, metronome])
  useEffect(() => { if (api.current) api.current.countInVolume = countIn ? 1 : 0 }, [api, countIn])

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

  useEffect(() => {
    const a = api.current
    if (!a || !info.score) return
    const track = info.score.tracks[info.trackIndex]
    if (loop && loopMode) {
      const { startTick, endTick } = barTickRange(info.score, loop.a, loop.b)
      const range = new synth.PlaybackRange()
      range.startTick = startTick
      range.endTick = endTick
      a.playbackRange = range
      a.isLooping = true
      const bars = track.staves[0].bars
      const first = bars[loop.a].voices[0].beats[0]
      const lastBeats = bars[loop.b].voices[0].beats
      a.highlightPlaybackRange(first, lastBeats[lastBeats.length - 1])
      a.tickPosition = startTick
    } else {
      a.playbackRange = null
      a.isLooping = false
      a.clearPlaybackRangeHighlight()
    }
  }, [api, info.score, info.trackIndex, loop, loopMode])

  const barCount = info.score?.masterBars.length ?? 0
  const selectTrack = (i: number) => {
    if (!info.score || !api.current) return
    setLoop(null)
    api.current.renderTracks([info.score.tracks[i]])
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)] short:hidden">
        <button type="button" aria-label="Retour aux morceaux" onClick={() => navigate('/morceaux')}
          className="flex size-12 shrink-0 items-center justify-center text-2xl text-muted">✕</button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold" data-testid="song-title">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {info.tracks.length > 1 && (
          <select aria-label="Piste" value={info.trackIndex} onChange={(e) => selectTrack(Number(e.target.value))}
            className="min-h-12 max-w-36 rounded-xl border border-border bg-surface px-2 text-sm">
            {info.tracks.map((t) => <option key={t.index} value={t.index}>{t.name || `Piste ${t.index + 1}`}</option>)}
          </select>
        )}
      </header>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" data-testid="tab-scroller">
        {info.error && <p role="alert" className="m-4 rounded-xl border border-bad/50 p-4">Ce morceau n'a pas pu être affiché. {info.error}</p>}
        <div ref={host} className="tab-host" data-testid="tab-host" />
      </div>

      <footer className="border-t border-border bg-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] short:py-1">
        {loopMode && (
          <p className="mb-1 text-center text-sm text-accent" aria-live="polite" data-testid="loop-label">
            {loop ? `Boucle : ${loopLabel(loop)}${loop.complete ? '' : ' — touche une autre mesure pour l’étendre'}` : 'Touche une mesure pour la jouer en boucle'}
          </p>
        )}
        <div className="short:flex short:items-center short:gap-3">
        <div className="flex items-center gap-2 short:flex-1 short:gap-3">
          <button type="button" onClick={() => api.current?.playPause()} disabled={!info.ready}
            aria-label={info.playing ? 'Pause' : 'Lecture'}
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-2xl text-bg disabled:opacity-40">
            {info.playing ? '❚❚' : '▶'}
          </button>
          <div className="min-w-0 flex-1 text-sm">
            <p className="tabular-nums" data-testid="bar-position">{barCount ? `Mesure ${info.currentBar + 1} / ${barCount}` : 'Chargement…'}</p>
            {!info.ready && <p className="text-xs text-muted">Chargement des sons… {Math.round(info.loadProgress * 100)} %</p>}
          </div>
          <div className="flex items-center" role="group" aria-label="Tempo">
            <button type="button" aria-label="Ralentir" disabled={tempo <= TEMPO_MIN}
              onClick={() => setTempo((t) => clampTempo(t - TEMPO_STEP))}
              className="size-12 rounded-xl border border-border text-xl disabled:opacity-40">−</button>
            <output className="w-16 text-center font-semibold tabular-nums" aria-label="Tempo">{tempo} %</output>
            <button type="button" aria-label="Accélérer" disabled={tempo >= TEMPO_MAX}
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
