import { describe, expect, it } from 'vitest'
import { midiToFreq } from '../music/notes'
import { TUNINGS } from '../music/tunings'
import { barPosition, computeReading, InTuneTracker, instruction, nearestString, statusFor } from './tuner'

const std = TUNINGS.standard
const detune = (f: number, c: number) => f * 2 ** (c / 1200)

describe('nearestString', () => {
  it('trouve la corde de chaque note à vide', () => {
    std.strings.forEach((m, i) => expect(nearestString(midiToFreq(m), std, 440)).toBe(i))
  })
  it('reconnaît une corde très désaccordée (Mi grave un ton trop bas)', () => {
    expect(nearestString(midiToFreq(38), std, 440)).toBe(0)
  })
  it('garde la corde précédente près du point milieu (hystérésis)', () => {
    // Milieu entre G3 (55) et B3 (59) = 57 ; légèrement côté B3.
    const f = midiToFreq(57.1)
    expect(nearestString(f, std, 440)).toBe(4)
    expect(nearestString(f, std, 440, 3)).toBe(3)
  })
  it('respecte le diapason', () => {
    expect(nearestString(110 * (432 / 440), std, 432)).toBe(1)
  })
})

describe('computeReading', () => {
  it('mode auto : La un peu haut', () => {
    const r = computeReading(detune(110, 12), std, 440, { kind: 'auto' })
    expect(r.stringIndex).toBe(1)
    expect(r.target.fr).toBe('La')
    expect(r.cents).toBeCloseTo(12)
    expect(r.status).toBe('high')
  })
  it('mode manuel : mesure par rapport à la corde choisie, même loin', () => {
    const r = computeReading(110, std, 440, { kind: 'manual', stringIndex: 0 })
    expect(r.target.en).toBe('E')
    expect(r.cents).toBeCloseTo(500)
    expect(r.heard.fr).toBe('La')
  })
  it('vert dans ±5 cents', () => {
    expect(statusFor(5)).toBe('ok')
    expect(statusFor(-5)).toBe('ok')
    expect(statusFor(5.1)).toBe('high')
    expect(statusFor(-6)).toBe('low')
  })
})

describe('barPosition / instruction', () => {
  it('borne la barre à ±50 cents', () => {
    expect(barPosition(0)).toBe(0.5)
    expect(barPosition(-50)).toBe(0)
    expect(barPosition(200)).toBe(1)
    expect(barPosition(25)).toBe(0.75)
  })
  it('donne une consigne adaptée', () => {
    const at = (c: number) => instruction(computeReading(detune(110, c), std, 440, { kind: 'manual', stringIndex: 1 }))
    expect(at(0)).toBe('Parfait !')
    expect(at(-20)).toMatch(/serre/)
    expect(at(-80)).toMatch(/Beaucoup trop bas/)
    expect(at(20)).toMatch(/desserre/)
  })
})

describe('InTuneTracker', () => {
  const ok = computeReading(110, std, 440, { kind: 'auto' })
  const off = computeReading(detune(110, 20), std, 440, { kind: 'auto' })
  it('valide une corde après 800 ms juste, une seule fois', () => {
    const t = new InTuneTracker(800)
    expect(t.push(ok, 0)).toBeNull()
    expect(t.push(ok, 500)).toBeNull()
    expect(t.push(ok, 800)).toBe(1)
    expect(t.push(ok, 900)).toBeNull()
  })
  it('repart de zéro si la note sort de la zone', () => {
    const t = new InTuneTracker(800)
    t.push(ok, 0)
    t.push(off, 500)
    expect(t.push(ok, 900)).toBeNull()
    expect(t.push(ok, 1700)).toBe(1)
  })
})
