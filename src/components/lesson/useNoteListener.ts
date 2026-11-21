import { useCallback, useRef, useState } from 'react'
import type { TimedPitchFrame } from '../../audio/pitchListener'
import { midiToNoteName, freqToMidi, type NoteName } from '../../lib/music/notes'
import { NoteMatcher, type MatchEvent } from '../../lib/lessons/matcher'
import { TunerSmoother } from '../../lib/tuner/smoother'

/**
 * Relie les trames du micro au comparateur de notes. Ne déclenche un rendu
 * React que lorsque la note entendue change, ou lors d'un événement.
 */
export function useNoteListener(a4Hz: number, onEvent: (e: MatchEvent) => void) {
  const smoother = useRef(new TunerSmoother({ holdMs: 150 }))
  const matcher = useRef(new NoteMatcher())
  const [heard, setHeard] = useState<NoteName | null>(null)
  const heardMidi = useRef<number | null>(null)
  const eventRef = useRef(onEvent)
  eventRef.current = onEvent
  const a4 = useRef(a4Hz)
  a4.current = a4Hz

  const onFrame = useCallback((f: TimedPitchFrame) => {
    const freq = smoother.current.push(f, f.t)
    const midi = freq === null ? null : Math.round(freqToMidi(freq, a4.current))
    if (midi !== heardMidi.current) {
      heardMidi.current = midi
      setHeard(midi === null ? null : midiToNoteName(midi))
    }
    const e = matcher.current.push(freq, performance.now())
    if (e) eventRef.current(e)
  }, [])

  const setTarget = useCallback((midi: number | null) => matcher.current.setTarget(midi, a4.current), [])
  const muteFor = useCallback((ms: number) => matcher.current.mute(performance.now() + ms), [])

  return { onFrame, setTarget, muteFor, heard }
}
