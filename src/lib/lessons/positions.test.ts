import { describe, expect, it } from 'vitest'
import { isNatural, poolPositions, positionNote, positionToMidi, stringLabel } from './positions'

describe('positions', () => {
  it('convertit corde/case en note (accordage standard)', () => {
    expect(positionToMidi({ string: 6, fret: 0 })).toBe(40)
    expect(positionToMidi({ string: 1, fret: 0 })).toBe(64)
    expect(positionNote({ string: 6, fret: 3 }).fr).toBe('Sol')
    expect(positionNote({ string: 5, fret: 3 }).fr).toBe('Do')
    expect(positionNote({ string: 3, fret: 4 }).fr).toBe('Si')
    expect(positionNote({ string: 2, fret: 1 }).fr).toBe('Do')
    expect(positionNote({ string: 6, fret: 12 })).toMatchObject({ fr: 'Mi', octave: 3 })
  })

  it('reconnaît les notes naturelles', () => {
    expect([60, 62, 64, 65, 67, 69, 71].every(isNatural)).toBe(true)
    expect([61, 63, 66, 68, 70].some(isNatural)).toBe(false)
  })

  it('liste les notes naturelles de la 6e corde', () => {
    const frets = poolPositions({ strings: [6], frets: [0, 12], naturalOnly: true }).map((p) => p.fret)
    expect(frets).toEqual([0, 1, 3, 5, 7, 8, 10, 12])
  })

  it('nomme les cordes', () => {
    expect(stringLabel(6)).toBe('corde de Mi grave (6e)')
    expect(stringLabel(3)).toBe('corde de Sol (3e)')
    expect(stringLabel(1)).toBe('corde de Mi aigu (1re)')
  })
})
