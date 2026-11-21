/**
 * Sélection de la boucle A–B au toucher, en mode « Boucle » :
 * 1er toucher → boucle sur cette mesure ; 2e toucher → étend jusqu'à la mesure touchée ;
 * toucher suivant → nouvelle boucle sur la mesure touchée.
 */
export interface LoopSelection {
  /** Première et dernière mesure (indices 0), a ≤ b. */
  a: number
  b: number
  /** La 2e borne a été choisie : le prochain toucher recommence une sélection. */
  complete: boolean
}

export function tapBar(sel: LoopSelection | null, bar: number): LoopSelection {
  if (!sel || sel.complete) return { a: bar, b: bar, complete: false }
  const anchor = sel.a
  return { a: Math.min(anchor, bar), b: Math.max(anchor, bar), complete: true }
}

/** « Mesure 4 » ou « Mesures 3 à 6 » */
export function loopLabel(sel: LoopSelection): string {
  return sel.a === sel.b ? `Mesure ${sel.a + 1}` : `Mesures ${sel.a + 1} à ${sel.b + 1}`
}

export const TEMPO_MIN = 50
export const TEMPO_MAX = 100
export const TEMPO_STEP = 5

export function clampTempo(pct: number): number {
  const stepped = Math.round(pct / TEMPO_STEP) * TEMPO_STEP
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, stepped))
}
