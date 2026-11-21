import { describe, expect, it } from 'vitest'
import { guitarLike, whiteNoise } from '../../test/synth'
import { centsBetween, midiToFreq } from '../music/notes'
import { TUNINGS } from '../music/tunings'
import { createDetector, windowSizeFor } from './detect'

const SR = 48000
const N = windowSizeFor(SR)

describe('windowSizeFor', () => {
  it('donne ~80 ms en puissance de 2', () => {
    expect(windowSizeFor(48000)).toBe(4096)
    expect(windowSizeFor(44100)).toBe(4096)
  })
})

describe('createDetector', () => {
  const detect = createDetector(N)
  const all = new Set([...TUNINGS.standard.strings, ...TUNINGS.dropD.strings, ...TUNINGS.openG.strings])

  for (const midi of all) {
    const f = midiToFreq(midi)
    it(`détecte ${f.toFixed(2)} Hz à ±1 cent, sans erreur d'octave`, () => {
      const r = detect(guitarLike(f, SR, N), SR)
      expect(r.freq).not.toBeNull()
      expect(Math.abs(centsBetween(r.freq!, f))).toBeLessThan(1)
      expect(r.clarity).toBeGreaterThan(0.9)
    })
  }

  it('reste juste avec une 2e harmonique plus forte que la fondamentale (Mi grave)', () => {
    const r = detect(guitarLike(82.41, SR, N, { harmonics: [0.5, 1, 0.6, 0.3] }), SR)
    expect(Math.abs(centsBetween(r.freq!, 82.41))).toBeLessThan(2)
  })

  it('tolère un peu de bruit', () => {
    const r = detect(guitarLike(146.83, SR, N, { noise: 0.02 }), SR)
    expect(Math.abs(centsBetween(r.freq!, 146.83))).toBeLessThan(2)
  })

  it('distingue 3 cents d’écart', () => {
    const f = 110 * 2 ** (3 / 1200)
    const r = detect(guitarLike(f, SR, N), SR)
    expect(centsBetween(r.freq!, 110)).toBeCloseTo(3, 0)
  })

  it('rejette le bruit (netteté basse) et le silence', () => {
    expect(detect(whiteNoise(N), SR).clarity).toBeLessThan(0.9)
    const silent = detect(new Float32Array(N), SR)
    expect(silent.rms).toBe(0)
  })
})
