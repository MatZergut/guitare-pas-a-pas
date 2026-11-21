/**
 * Calcule une tablature pour les pistes qui n'en ont pas (MusicXML de
 * logiciels de partition) : position ouverte, la plus simple pour débuter.
 *
 * Conventions alphaTab : `note.string` 1 = corde la plus grave ;
 * `tuning` liste les cordes de la plus aiguë à la plus grave.
 */

export const STANDARD_TUNING = [64, 59, 55, 50, 45, 40]
export const MAX_FRET = 19

export interface Placement {
  /** Numérotation alphaTab : 1 = Mi grave. */
  string: number
  fret: number
}

function openMidi(tuning: number[], string: number): number {
  return tuning[tuning.length - string]
}

/**
 * Place les notes d'un accord (ou une note seule) sur des cordes différentes,
 * de l'aiguë vers la grave, en choisissant à chaque fois la case la plus basse.
 * Retourne null pour une note injouable (trop grave ou trop aiguë).
 */
export function placeChord(midis: number[], tuning = STANDARD_TUNING): (Placement | null)[] {
  const used = new Set<number>()
  const order = midis.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m)
  const out: (Placement | null)[] = midis.map(() => null)
  for (const { m, i } of order) {
    let best: Placement | null = null
    for (let s = tuning.length; s >= 1; s--) {
      if (used.has(s)) continue
      const fret = m - openMidi(tuning, s)
      if (fret < 0 || fret > MAX_FRET) continue
      if (!best || fret < best.fret) best = { string: s, fret }
    }
    if (best) used.add(best.string)
    out[i] = best
  }
  return out
}

/** Ramène une note hors tessiture dans la guitare (par octaves). */
export function foldIntoRange(midi: number, tuning = STANDARD_TUNING): number {
  const low = Math.min(...tuning)
  const high = Math.max(...tuning) + MAX_FRET
  let m = midi
  while (m < low) m += 12
  while (m > high) m -= 12
  return m
}

// --- Application au modèle alphaTab (types minimaux, testables sans la bibliothèque) ---

interface NoteLike { realValue: number; string: number; fret: number; octave: number; tone: number }
interface StaffLike {
  isStringed: boolean
  showTablature: boolean
  showStandardNotation: boolean
  stringTuning: { tunings: number[] }
  bars: { voices: { beats: { notes: NoteLike[] }[] }[] }[]
}

/**
 * Donne une tablature à une portée qui n'en a pas. Retourne le nombre de
 * notes déplacées d'octave pour tenir sur le manche.
 */
export function ensureTablature(staff: StaffLike, tuning = STANDARD_TUNING): number {
  if (staff.isStringed) return 0
  let folded = 0
  // Les hauteurs doivent être lues AVANT de changer l'accordage.
  const plan = staff.bars.flatMap((bar) => bar.voices.flatMap((v) => v.beats.map((b) => ({ b, midis: b.notes.map((n) => n.realValue) }))))
  staff.stringTuning.tunings = [...tuning]
  for (const { b, midis } of plan) {
    const fitted = midis.map((m) => foldIntoRange(m, tuning))
    folded += fitted.filter((m, i) => m !== midis[i]).length
    const places = placeChord(fitted, tuning)
    b.notes.forEach((n, i) => {
      const p = places[i]
      if (!p) return
      n.string = p.string
      n.fret = p.fret
    })
  }
  staff.showTablature = true
  staff.showStandardNotation = false
  return folded
}
