import { describe, expect, it } from 'vitest'
import { centsBetween } from '../music/notes'
import { createDetector } from '../tuner/detect'
import { pluck } from './pluck'

describe('pluck (Karplus-Strong)', () => {
  const SR = 48000
  const detect = createDetector(4096)
  for (const f of [82.41, 110, 196, 329.63, 523.25]) {
    it(`produit un son à la bonne hauteur (${f} Hz, ±5 cents)`, () => {
      const s = pluck(f, SR, 0.5)
      const r = detect(s.subarray(4096, 8192), SR)
      expect(Math.abs(centsBetween(r.freq!, f))).toBeLessThan(5)
    })
  }
  it('reste dans [-1, 1] et s’éteint sans clic', () => {
    const s = pluck(110, SR, 1)
    expect(Math.max(...s.map(Math.abs))).toBeLessThanOrEqual(0.5 + 1e-6)
    expect(Math.abs(s[s.length - 1])).toBeLessThan(1e-3)
  })
})
