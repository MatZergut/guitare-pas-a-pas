import { describe, expect, it } from 'vitest'
import { centsBetween } from '../music/notes'
import { TunerSmoother } from './smoother'

const f = (freq: number | null, clarity = 0.97, rms = 0.05) => ({ freq, clarity, rms })

describe('TunerSmoother', () => {
  it('ignore les trames trop faibles ou pas nettes', () => {
    const s = new TunerSmoother()
    expect(s.push(f(110, 0.5), 0)).toBeNull()
    expect(s.push(f(110, 0.97, 0.0001), 20)).toBeNull()
    expect(s.push(f(null), 40)).toBeNull()
    expect(s.push(f(110), 60)).toBeCloseTo(110)
  })

  it('réduit la gigue autour de la note', () => {
    const s = new TunerSmoother()
    const jitter = [0, 8, -8, 6, -6, 8, -8, 6, -6, 8]
    let out = 0
    jitter.forEach((c, i) => (out = s.push(f(110 * 2 ** (c / 1200)), i * 20)!))
    expect(Math.abs(centsBetween(out, 110))).toBeLessThan(3)
  })

  it('ignore un saut d’octave isolé (filtre médian)', () => {
    const s = new TunerSmoother()
    for (let i = 0; i < 5; i++) s.push(f(110), i * 20)
    const out = s.push(f(220), 100)!
    expect(Math.abs(centsBetween(out, 110))).toBeLessThan(1)
  })

  it('suit immédiatement une nouvelle note', () => {
    const s = new TunerSmoother()
    for (let i = 0; i < 5; i++) s.push(f(110), i * 20)
    s.push(f(146.83), 100)
    s.push(f(146.83), 120)
    const out = s.push(f(146.83), 140)!
    expect(Math.abs(centsBetween(out, 146.83))).toBeLessThan(1)
  })

  it('garde la lecture un court instant puis revient au repos', () => {
    const s = new TunerSmoother({ holdMs: 500 })
    s.push(f(110), 0)
    expect(s.push(f(null), 300)).toBeCloseTo(110)
    expect(s.push(f(null), 600)).toBeNull()
  })
})
