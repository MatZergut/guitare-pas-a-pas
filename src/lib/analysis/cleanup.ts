import type { PlayedNote } from './types'

/** Intervalles des harmoniques qu'un modèle confond souvent avec des notes (octave, octave+quinte, 2 octaves). */
export const HARMONIC_INTERVALS = [12, 19, 24]
const SIMULTANEOUS = 0.06

/**
 * Retire les « fantômes » typiques de la transcription automatique :
 * - notes très faibles ;
 * - harmoniques et sous-octaves d'une note plus forte attaquée en même temps ;
 * - débuts de note bavés : une note très courte suivie de la même hauteur juste après.
 */
export function cleanPlayedNotes(notes: PlayedNote[], minAmplitude = 0.3): PlayedNote[] {
  let list = notes.filter((n) => n.amplitude >= minAmplitude).sort((a, b) => a.onset - b.onset || a.pitch - b.pitch)

  list = list.filter((n) => !list.some((m) => m !== n && Math.abs(m.onset - n.onset) <= SIMULTANEOUS && m.amplitude > n.amplitude &&
    (HARMONIC_INTERVALS.includes(n.pitch - m.pitch) || (m.pitch - n.pitch === 12 && n.amplitude < 0.6 * m.amplitude))))

  list = list.filter((n) => !(n.duration < 0.2 && list.some((m) => m !== n && m.pitch === n.pitch && m.onset > n.onset && m.onset - n.onset < 0.3)))
  return list
}

/**
 * Une note « en trop » qui n'est qu'une harmonique d'une note juste encore
 * en train de sonner ne doit pas être comptée comme une erreur.
 */
export function isHarmonicOf(extra: PlayedNote, sounding: PlayedNote[]): boolean {
  return sounding.some((m) => {
    const d = extra.pitch - m.pitch
    const ringing = extra.onset >= m.onset - SIMULTANEOUS && extra.onset <= m.onset + m.duration
    return ringing && (HARMONIC_INTERVALS.includes(d) || d === -12) && extra.amplitude <= m.amplitude * 1.1
  })
}
