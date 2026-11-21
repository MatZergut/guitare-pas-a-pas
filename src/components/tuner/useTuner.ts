import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimedPitchFrame } from '../../audio/pitchListener'
import type { Tuning } from '../../lib/music/tunings'
import { TunerSmoother } from '../../lib/tuner/smoother'
import { computeReading, InTuneTracker, type TunerMode, type TunerReading } from '../../lib/tuner/tuner'

/**
 * Relie le flux de trames du micro à l'état affiché. Les mises à jour React
 * sont regroupées sur requestAnimationFrame (au plus une par image).
 */
export function useTuner(tuning: Tuning, a4Hz: number, mode: TunerMode) {
  const [reading, setReading] = useState<TunerReading | null>(null)
  const [tuned, setTuned] = useState<ReadonlySet<number>>(new Set())
  const smoother = useRef(new TunerSmoother())
  const tracker = useRef(new InTuneTracker())
  const prevString = useRef<number | undefined>(undefined)
  const pending = useRef<TunerReading | null | undefined>(undefined)
  const raf = useRef(0)
  const cfg = useRef({ tuning, a4Hz, mode })
  cfg.current = { tuning, a4Hz, mode }

  // Changer d'accordage ou de diapason invalide les cordes validées.
  useEffect(() => {
    setTuned(new Set())
    smoother.current.reset()
    prevString.current = undefined
  }, [tuning, a4Hz])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const onFrame = useCallback((f: TimedPitchFrame) => {
    const { tuning, a4Hz, mode } = cfg.current
    const freq = smoother.current.push(f, f.t)
    const r = freq === null ? null : computeReading(freq, tuning, a4Hz, mode, prevString.current)
    if (r) prevString.current = r.stringIndex
    const done = tracker.current.push(r, f.t)
    if (done !== null) {
      setTuned((s) => new Set(s).add(done))
      navigator.vibrate?.(40)
    }
    pending.current = r
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        if (pending.current !== undefined) setReading(pending.current)
        pending.current = undefined
      })
    }
  }, [])

  return { reading, tuned, onFrame }
}
