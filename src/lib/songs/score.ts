/**
 * Fonctions pures sur le modèle de partition d'alphaTab (types seulement :
 * ce module n'embarque pas la bibliothèque).
 */
import type { model } from '@coderline/alphatab'

type Score = model.Score
type Track = model.Track

/** Ticks MIDI par noire dans alphaTab. */
export const TICKS_PER_QUARTER = 960

export function expectedBarTicks(numerator: number, denominator: number): number {
  return (numerator * 4 * TICKS_PER_QUARTER) / denominator
}

export interface BarIssue {
  bar: number
  expected: number
  actual: number
}

/** Mesures dont la durée ne correspond pas au chiffrage (trop longues ou trop courtes). */
export function barDurationIssues(track: Track): BarIssue[] {
  const issues: BarIssue[] = []
  track.staves[0].bars.forEach((bar, i) => {
    const mb = bar.masterBar
    const expected = expectedBarTicks(mb.timeSignatureNumerator, mb.timeSignatureDenominator)
    const actual = bar.voices[0].beats.reduce((s, b) => s + b.playbackDuration, 0)
    if (actual !== expected) issues.push({ bar: i + 1, expected, actual })
  })
  return issues
}

/** Piste à afficher par défaut : la première piste à cordes (guitare), sinon la première. */
export function pickGuitarTrack(score: Score): Track {
  const melodic = score.tracks.filter((t) => !t.staves.some((s) => s.isPercussion))
  return melodic.find((t) => t.staves.some((s) => s.isStringed && s.tuning.length === 6)) ?? melodic[0] ?? score.tracks[0]
}

/** Plage de ticks couvrant les mesures a..b (indices 0, ordre indifférent). */
export function barTickRange(score: Score, a: number, b: number): { startTick: number; endTick: number } {
  const [from, to] = a <= b ? [a, b] : [b, a]
  const last = score.masterBars[to]
  return { startTick: score.masterBars[from].start, endTick: last.start + last.calculateDuration() }
}

/** Cases min et max utilisées (pour vérifier qu'un morceau reste jouable par un débutant). */
export function fretRange(track: Track): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const bar of track.staves[0].bars)
    for (const beat of bar.voices[0].beats)
      for (const n of beat.notes) {
        min = Math.min(min, n.fret)
        max = Math.max(max, n.fret)
      }
  return [min, max]
}
