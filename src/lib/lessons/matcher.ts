import { centsBetween, freqToMidi, midiToFreq } from '../music/notes'

export interface MatcherOptions {
  /** Tolérance d'acceptation (cents). */
  toleranceCents: number
  /** Durée pendant laquelle la bonne note doit tenir pour être validée. */
  holdMs: number
  /** Durée pendant laquelle une autre note doit tenir pour compter comme erreur. */
  wrongHoldMs: number
}

export const DEFAULT_MATCHER: MatcherOptions = { toleranceCents: 30, holdMs: 150, wrongHoldMs: 300 }

export type MatchEvent =
  | { type: 'match' }
  /** Autre note jouée, tenue assez longtemps. */
  | { type: 'wrong'; heardMidi: number }
  /** Bonne note mais hors tolérance : la guitare est sans doute désaccordée. */
  | { type: 'detuned'; cents: number }

/**
 * Compare le flux de fréquences lissées à une note attendue.
 * - N'émet chaque événement qu'une fois par note tenue.
 * - Après un changement de cible, ignore la note qui résonne encore
 *   jusqu'à ce qu'une autre note soit jouée ou que le son s'arrête.
 * - `mute()` ignore le micro pendant que l'appli joue elle-même une note.
 */
export class NoteMatcher {
  private readonly o: MatcherOptions
  private target: number | null = null
  private a4 = 440
  private candidate: number | null = null
  private since = 0
  private emitted = false
  private ignoreMidi: number | null = null
  private mutedUntil = -Infinity

  constructor(options: Partial<MatcherOptions> = {}) {
    this.o = { ...DEFAULT_MATCHER, ...options }
  }

  setTarget(midi: number | null, a4Hz = 440): void {
    // Redéfinir la même cible ne doit pas remettre la détection à zéro.
    if (midi === this.target && a4Hz === this.a4) return
    this.ignoreMidi = this.candidate
    this.target = midi
    this.a4 = a4Hz
    this.candidate = null
    this.emitted = false
  }

  mute(untilMs: number): void {
    this.mutedUntil = untilMs
    this.candidate = null
  }

  push(freq: number | null, timeMs: number): MatchEvent | null {
    if (timeMs < this.mutedUntil) return null
    if (freq === null) {
      this.candidate = null
      this.ignoreMidi = null
      return null
    }
    const heard = Math.round(freqToMidi(freq, this.a4))
    if (heard !== this.candidate) {
      this.candidate = heard
      this.since = timeMs
      this.emitted = false
    }
    if (this.ignoreMidi !== null) {
      if (heard === this.ignoreMidi) return null
      this.ignoreMidi = null
    }
    if (this.target === null || this.emitted) return null

    const held = timeMs - this.since
    if (heard === this.target) {
      const cents = centsBetween(freq, midiToFreq(this.target, this.a4))
      if (Math.abs(cents) <= this.o.toleranceCents) {
        if (held >= this.o.holdMs) {
          this.emitted = true
          return { type: 'match' }
        }
        return null
      }
      if (held >= this.o.wrongHoldMs) {
        this.emitted = true
        return { type: 'detuned', cents }
      }
      return null
    }
    if (held >= this.o.wrongHoldMs) {
      this.emitted = true
      return { type: 'wrong', heardMidi: heard }
    }
    return null
  }
}

/** Conseil quand la note jouée n'est pas la bonne (en supposant la même corde). */
export function hintFor(heardMidi: number, targetMidi: number): string {
  const d = targetMidi - heardMidi
  if (d === 0) return ''
  if (Math.abs(d) % 12 === 0) return 'Bonne note, mais pas à la bonne octave : vérifie la corde.'
  const n = Math.abs(d)
  const cases = `${n} case${n > 1 ? 's' : ''}`
  if (n > 12) return d > 0 ? 'Beaucoup trop grave : vérifie la corde.' : 'Beaucoup trop aigu : vérifie la corde.'
  return d > 0
    ? `Trop grave de ${cases} : avance vers la caisse de la guitare.`
    : `Trop aigu de ${cases} : recule vers la tête de la guitare.`
}
