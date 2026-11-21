import { centsBetween, freqToMidi, midiToFreq, midiToNoteName, type NoteName } from '../music/notes'
import type { Tuning } from '../music/tunings'

export type TunerMode = { kind: 'auto' } | { kind: 'manual'; stringIndex: number }

export type TuneStatus = 'ok' | 'low' | 'high'

export interface TunerReading {
  /** Corde visée (0 = 6e corde, grave). */
  stringIndex: number
  target: NoteName
  targetFreq: number
  /** Note réellement entendue (demi-ton le plus proche). */
  heard: NoteName
  freq: number
  /** Écart par rapport à la corde visée, en cents (non borné). */
  cents: number
  status: TuneStatus
}

/** Zone « accordé » : ±5 cents. */
export const IN_TUNE_CENTS = 5
/** Échelle affichée sur la barre. */
export const SCALE_CENTS = 50
/** Marge pour ne pas basculer d'une corde à l'autre à mi-chemin. */
export const STRING_HYSTERESIS_CENTS = 40

/**
 * Corde la plus proche d'une fréquence (en cents). `previous` donne un léger
 * avantage à la corde déjà sélectionnée pour éviter le clignotement.
 */
export function nearestString(freq: number, tuning: Tuning, a4Hz: number, previous?: number): number {
  let best = 0
  let bestDist = Infinity
  tuning.strings.forEach((midi, i) => {
    let d = Math.abs(centsBetween(freq, midiToFreq(midi, a4Hz)))
    if (i === previous) d -= STRING_HYSTERESIS_CENTS
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}

export function statusFor(cents: number): TuneStatus {
  if (Math.abs(cents) <= IN_TUNE_CENTS) return 'ok'
  return cents < 0 ? 'low' : 'high'
}

export function computeReading(
  freq: number,
  tuning: Tuning,
  a4Hz: number,
  mode: TunerMode,
  previousString?: number,
): TunerReading {
  const stringIndex = mode.kind === 'manual' ? mode.stringIndex : nearestString(freq, tuning, a4Hz, previousString)
  const targetMidi = tuning.strings[stringIndex]
  const targetFreq = midiToFreq(targetMidi, a4Hz)
  const cents = centsBetween(freq, targetFreq)
  return {
    stringIndex,
    target: midiToNoteName(targetMidi),
    targetFreq,
    heard: midiToNoteName(freqToMidi(freq, a4Hz)),
    freq,
    cents,
    status: statusFor(cents),
  }
}

/** Position du repère sur la barre, de 0 (−50 c) à 1 (+50 c). */
export function barPosition(cents: number): number {
  const c = Math.max(-SCALE_CENTS, Math.min(SCALE_CENTS, cents))
  return (c + SCALE_CENTS) / (2 * SCALE_CENTS)
}

/** Consigne courte pour un débutant. */
export function instruction(r: TunerReading): string {
  if (r.status === 'ok') return 'Parfait !'
  const far = Math.abs(r.cents) > SCALE_CENTS
  if (r.status === 'low') return far ? 'Beaucoup trop bas : serre la corde' : 'Un peu bas : serre légèrement'
  return far ? 'Beaucoup trop haut : desserre la corde' : 'Un peu haut : desserre légèrement'
}

/**
 * Valide une corde quand elle reste juste pendant `holdMs` d'affilée.
 * Retourne l'index de la corde au moment où elle devient validée, sinon null.
 */
export class InTuneTracker {
  private since: number | null = null
  private stringIndex = -1
  private confirmed = false

  constructor(private readonly holdMs = 800) {}

  push(reading: TunerReading | null, timeMs: number): number | null {
    if (!reading || reading.status !== 'ok') {
      this.since = null
      this.confirmed = false
      return null
    }
    if (reading.stringIndex !== this.stringIndex || this.since === null) {
      this.stringIndex = reading.stringIndex
      this.since = timeMs
      this.confirmed = false
    }
    if (!this.confirmed && timeMs - this.since >= this.holdMs) {
      this.confirmed = true
      return this.stringIndex
    }
    return null
  }
}
