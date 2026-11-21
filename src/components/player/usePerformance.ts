import { model, synth, type AlphaTabApi } from '@coderline/alphatab'
import { useCallback, useRef, useState } from 'react'
import { MicError } from '../../audio/pitchListener'
import { Recorder, transcribe } from '../../audio/recorder'
import { db } from '../../db/db'
import { analyzePerformance } from '../../lib/analysis/align'
import { cleanPlayedNotes } from '../../lib/analysis/cleanup'
import { expectedNotesFromTrack, ticksToRecordingTime, type ScoreNote } from '../../lib/analysis/expected'
import { estimateLatencyMs, linearFit } from '../../lib/analysis/signal'
import type { AnalysisResult, NoteResult } from '../../lib/analysis/types'
import { barTickRange } from '../../lib/songs/score'
import { useSettings } from '../../stores/settings'

export interface Section { from: number; to: number }

export type PerfPhase =
  | { kind: 'idle' }
  | { kind: 'recording'; section: Section }
  | { kind: 'analyzing'; stage: 'model' | 'analysis'; pct: number }
  | { kind: 'result'; section: Section; result: AnalysisResult; tempo: number }
  | { kind: 'calibrated'; latencyMs: number }
  | { kind: 'error'; message: string }

const COLORS = { ok: '#16a34a', warn: '#f59e0b', bad: '#ef4444' }

export function verdictColor(r: NoteResult): string {
  switch (r.verdict.kind) {
    case 'ok': return r.incompleteChord ? COLORS.warn : COLORS.ok
    case 'early':
    case 'late': return COLORS.warn
    default: return COLORS.bad
  }
}

interface Ctx {
  api: React.RefObject<AlphaTabApi | null>
  score: model.Score | null
  trackIndex: number
  songId: string
  tempo: number
  /** Remet les réglages de lecture choisis par l'utilisateur après l'enregistrement. */
  restorePlayback: () => void
}

/** Enregistre une section avec le métronome, la transcrit et l'analyse (ou calibre la latence). */
export function usePerformance({ api, score, trackIndex, songId, tempo, restorePlayback }: Ctx) {
  const [phase, setPhase] = useState<PerfPhase>({ kind: 'idle' })
  const recorder = useRef<Recorder | null>(null)
  const colored = useRef<ScoreNote[]>([])
  const cleanup = useRef<() => void>(() => {})

  const clearColors = useCallback(() => {
    if (!colored.current.length) return
    for (const n of colored.current) n.ref.style = undefined
    colored.current = []
    api.current?.render()
  }, [api])

  const close = useCallback(() => {
    clearColors()
    setPhase({ kind: 'idle' })
  }, [clearColors])

  const start = useCallback(async (section: Section, mode: 'analysis' | 'calibration') => {
    const a = api.current
    if (!a || !score) return
    clearColors()
    const track = score.tracks[trackIndex]
    const { latencyMs, timingToleranceMs, set } = useSettings.getState()
    setPhase({ kind: 'recording', section })

    const rec = new Recorder()
    recorder.current = rec
    try {
      await rec.start()
    } catch (e) {
      rec.dispose()
      setPhase({ kind: 'error', message: e instanceof MicError && e.kind === 'denied'
        ? 'Le micro est bloqué. Autorise-le dans les réglages du site (cadenas à gauche de l’adresse).'
        : 'Le micro n’a pas pu démarrer.' })
      return
    }

    // Lecture : guitare coupée, métronome + décompte, uniquement la section.
    const { startTick, endTick } = barTickRange(score, section.from, section.to)
    a.changeTrackMute([track], true)
    a.metronomeVolume = 1
    a.countInVolume = 1
    a.isLooping = false
    const range = new synth.PlaybackRange()
    range.startTick = startTick
    range.endTick = endTick
    a.playbackRange = range
    a.tickPosition = startTick

    const points: [number, number][] = []
    const onPos = (e: { currentTick: number }) => {
      if (e.currentTick > startTick && e.currentTick <= endTick) points.push([e.currentTick, performance.now()])
    }
    let finished = false
    const finish = async () => {
      if (finished) return
      finished = true
      cleanup.current()
      await new Promise((r) => setTimeout(r, 400)) // laisser sonner la dernière note
      let recording
      try {
        recording = await rec.stop()
      } catch {
        setPhase({ kind: 'error', message: 'L’enregistrement a échoué.' })
        return
      }
      a.changeTrackMute([track], false)
      restorePlayback()
      if (points.length < 4) {
        setPhase({ kind: 'error', message: 'La lecture n’a pas pu être suivie. Réessaie.' })
        return
      }
      const fit = linearFit(points.map((p) => p[0]), points.map((p) => p[1]))
      const scoreNotes = expectedNotesFromTrack(track, section.from, section.to)
      const lat = mode === 'calibration' ? 0 : (latencyMs ?? 0)
      const expected = scoreNotes.map((n) => ({ id: n.id, pitch: n.pitch, bar: n.bar, time: ticksToRecordingTime(n.tick, fit, recording.startPerfMs, lat) }))

      setPhase({ kind: 'analyzing', stage: 'model', pct: 0 })
      let played
      try {
        played = cleanPlayedNotes((await transcribe(recording, (stage, pct) => setPhase({ kind: 'analyzing', stage, pct }))).notes)
      } catch (e) {
        setPhase({ kind: 'error', message: `L’analyse a échoué (${String(e)}).` })
        return
      }

      if (mode === 'calibration') {
        const measured = estimateLatencyMs(expected.map((e) => e.time), played.map((p) => p.onset))
        if (measured === null) {
          setPhase({ kind: 'error', message: 'Je n’ai pas assez entendu tes notes. Joue plus fort, bien sur chaque clic, puis réessaie.' })
          return
        }
        await set('latencyMs', measured)
        setPhase({ kind: 'calibrated', latencyMs: measured })
        return
      }

      const result = analyzePerformance(expected, played, { timingToleranceMs })
      // Couleurs sur la tablature
      const byId = new Map(scoreNotes.map((n) => [n.id, n]))
      for (const r of result.notes) {
        const n = byId.get(r.expected.id)
        if (!n) continue
        n.ref.style = new model.NoteStyle()
        n.ref.style.colors.set(model.NoteSubElement.GuitarTabFretNumber, model.Color.fromJson(verdictColor(r)))
      }
      colored.current = scoreNotes
      a.render()
      await db.performances.add({
        songId, score: result.score, tempoPercent: tempo, barRange: [section.from, section.to],
        topErrors: result.mistakes.map((m) => m.label), playedAt: Date.now(),
      })
      setPhase({ kind: 'result', section, result, tempo })
    }

    a.playerPositionChanged.on(onPos)
    a.playerFinished.on(finish)
    const guard = window.setTimeout(() => void finish(), 5 * 60_000)
    cleanup.current = () => {
      a.playerPositionChanged.off(onPos)
      a.playerFinished.off(finish)
      window.clearTimeout(guard)
      a.stop()
    }
    stopRef.current = () => void finish()
    a.play()
  }, [api, score, trackIndex, songId, tempo, restorePlayback, clearColors])

  const stopRef = useRef<() => void>(() => {})
  const stop = useCallback(() => stopRef.current(), [])

  return { phase, start, stop, close }
}
