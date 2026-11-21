import { midiToNoteName, type NoteName } from '../music/notes'
import { ordinal, TUNINGS } from '../music/tunings'
import type { Position, QuizPool, StringNumber } from './types'

/** Les leçons utilisent l'accordage standard. */
const STANDARD = TUNINGS.standard.strings

export const MAX_FRET = 12

export function openStringMidi(s: StringNumber): number {
  return STANDARD[6 - s]
}

export function positionToMidi(p: Position): number {
  return openStringMidi(p.string) + p.fret
}

export function positionNote(p: Position): NoteName {
  return midiToNoteName(positionToMidi(p))
}

const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11])

export function isNatural(midi: number): boolean {
  return NATURAL_PCS.has(((midi % 12) + 12) % 12)
}

/** « corde de Mi grave (6e) » */
export function stringLabel(s: StringNumber): string {
  const n = midiToNoteName(openStringMidi(s))
  const qual = s === 6 ? ' grave' : s === 1 ? ' aigu' : ''
  return `corde de ${n.fr}${qual} (${ordinal(s)})`
}

/** Toutes les positions d'un ensemble de questions. */
export function poolPositions(pool: QuizPool): Position[] {
  const out: Position[] = []
  for (const s of pool.strings) {
    for (let f = pool.frets[0]; f <= pool.frets[1]; f++) {
      const p = { string: s, fret: f }
      if (!pool.naturalOnly || isNatural(positionToMidi(p))) out.push(p)
    }
  }
  return out
}
