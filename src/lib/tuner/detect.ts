import { PitchDetector } from 'pitchy'

export interface PitchFrame {
  /** Fréquence détectée en Hz, ou null si aucune hauteur fiable. */
  freq: number | null
  /** Netteté McLeod 0..1 (1 = son parfaitement périodique). */
  clarity: number
  /** Niveau RMS 0..1 */
  rms: number
}

export interface DetectOptions {
  minFreq: number
  maxFreq: number
}

/** Plage utile pour une guitare : Ré grave en Drop D (73 Hz) → 12e case de la 1re corde (659 Hz) et un peu au-delà. */
export const GUITAR_RANGE: DetectOptions = { minFreq: 60, maxFreq: 1400 }

export function rms(buf: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  return Math.sqrt(s / buf.length)
}

/** Taille de fenêtre : ~80 ms, puissance de 2 (4096 à 44,1/48 kHz), assez pour 6 périodes du Mi grave. */
export function windowSizeFor(sampleRate: number): number {
  return 2 ** Math.ceil(Math.log2(sampleRate * 0.08))
}

/**
 * Détecteur monophonique (McLeod, via pitchy). Instancier une fois par taille
 * de fenêtre : les tampons FFT sont réutilisés, aucune allocation par trame.
 */
export function createDetector(windowSize: number, opts: DetectOptions = GUITAR_RANGE) {
  const detector = PitchDetector.forFloat32Array(windowSize)
  detector.minVolumeAbsolute = 0 // le filtrage par niveau est fait par TunerSmoother (réglable)
  return (buf: Float32Array, sampleRate: number): PitchFrame => {
    const level = rms(buf)
    const [pitch, clarity] = detector.findPitch(buf, sampleRate)
    const ok = Number.isFinite(pitch) && pitch >= opts.minFreq && pitch <= opts.maxFreq
    return { freq: ok ? pitch : null, clarity: Number.isFinite(clarity) ? clarity : 0, rms: level }
  }
}
