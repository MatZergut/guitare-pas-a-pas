import { describe, expect, it } from 'vitest'
import { guitarLike } from '../../test/synth'
import { centsBetween } from '../music/notes'
import { createDetector } from '../tuner/detect'
import { concat, estimateLatencyMs, linearFit, resample } from './signal'
import { cleanPlayedNotes } from './cleanup'

describe('resample', () => {
  it('48 kHz → 22,05 kHz conserve la hauteur', () => {
    const out = resample(guitarLike(196, 48000, 48000), 48000)
    expect(out.length).toBe(22050)
    const r = createDetector(2048)(out.subarray(0, 2048), 22050)
    expect(Math.abs(centsBetween(r.freq!, 196))).toBeLessThan(3)
  })
  it('concat', () => {
    expect(Array.from(concat([new Float32Array([1, 2]), new Float32Array([3])]))).toEqual([1, 2, 3])
  })
})

describe('linearFit', () => {
  it('retrouve une droite', () => {
    const { a, b } = linearFit([0, 960, 1920, 2880], [1000, 1500, 2000, 2500])
    expect(a).toBeCloseTo(1000)
    expect(b).toBeCloseTo(0.5208, 3)
  })
})

describe('estimateLatencyMs', () => {
  it('médiane des écarts, robuste aux attaques parasites', () => {
    const clicks = [1, 1.75, 2.5, 3.25, 4, 4.75]
    const onsets = [1.12, 1.87, 2.61, 3.38, 4.13, 4.85, 2.2]
    expect(estimateLatencyMs(clicks, onsets)).toBe(120)
  })
  it('null si trop peu d’attaques', () => {
    expect(estimateLatencyMs([1, 2, 3, 4, 5], [1.1])).toBeNull()
  })
})

describe('cleanPlayedNotes (sortie réelle de Basic Pitch sur un accord synthétique)', () => {
  // Relevé de la transcription d'un essai : Sol4 puis accord Do3 Mi3 Sol3.
  const raw = [
    [67, 1.987, 0.6, 0.71], [86, 1.987, 0.34, 0.36],
    [48, 2.416, 0.15, 0.48], [55, 2.474, 0.12, 0.5], [52, 2.474, 0.1, 0.38],
    [48, 2.579, 1.39, 0.68], [36, 2.579, 0.26, 0.27], [74, 2.59, 0.5, 0.34], [67, 2.59, 0.7, 0.58],
    [55, 2.59, 1.38, 0.74], [52, 2.59, 1.38, 0.76],
  ].map(([pitch, onset, duration, amplitude]) => ({ pitch, onset, duration, amplitude }))

  it('ne garde que les vraies notes', () => {
    const clean = cleanPlayedNotes(raw).map((n) => `${n.pitch}@${n.onset}`)
    expect(clean).toEqual(['67@1.987', '48@2.579', '52@2.59', '55@2.59'])
  })
})
