import type { PitchFrame } from './detect'

export interface SmootherOptions {
  /** Netteté minimale pour accepter une trame. */
  minClarity: number
  /** Niveau RMS minimal (≈ -50 dBFS par défaut). */
  minRms: number
  /** Taille du filtre médian (élimine les sauts d'octave isolés). */
  medianSize: number
  /** Coefficient du lissage exponentiel (0..1, plus petit = plus lisse). */
  alpha: number
  /** Saut (cents) au-delà duquel on considère qu'une nouvelle note est jouée. */
  jumpCents: number
  /** Durée pendant laquelle on garde la dernière lecture quand le son disparaît. */
  holdMs: number
}

export const DEFAULT_SMOOTHER: SmootherOptions = {
  minClarity: 0.9,
  minRms: 0.003,
  medianSize: 5,
  alpha: 0.3,
  jumpCents: 50,
  holdMs: 600,
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Lisse les lectures du détecteur. Travaille en cents absolus (1200·log2 f),
 * donc indépendamment du diapason. Retourne la fréquence lissée, ou null
 * quand il n'y a plus de son exploitable depuis `holdMs`.
 */
export class TunerSmoother {
  private readonly o: SmootherOptions
  private window: number[] = []
  private value: number | null = null
  private lastValidAt = -Infinity

  constructor(options: Partial<SmootherOptions> = {}) {
    this.o = { ...DEFAULT_SMOOTHER, ...options }
  }

  reset(): void {
    this.window = []
    this.value = null
    this.lastValidAt = -Infinity
  }

  push(frame: PitchFrame, timeMs: number): number | null {
    const valid = frame.freq !== null && frame.clarity >= this.o.minClarity && frame.rms >= this.o.minRms
    if (!valid) {
      if (timeMs - this.lastValidAt > this.o.holdMs) {
        this.value = null
        this.window = []
      }
      return this.current()
    }

    this.lastValidAt = timeMs
    const abs = 1200 * Math.log2(frame.freq!)
    this.window.push(abs)
    if (this.window.length > this.o.medianSize) this.window.shift()
    const m = median(this.window)

    if (this.value === null || Math.abs(m - this.value) > this.o.jumpCents) {
      // Nouvelle note : on repart de zéro, sans traîner l'ancienne valeur.
      this.value = m
      this.window = [abs]
    } else {
      this.value += this.o.alpha * (m - this.value)
    }
    return this.current()
  }

  private current(): number | null {
    return this.value === null ? null : 2 ** (this.value / 1200)
  }
}
