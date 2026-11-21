import { describe, expect, it } from 'vitest'
import { clampTempo, loopLabel, tapBar } from './loop'

describe('boucle A–B', () => {
  it('1er toucher : boucle sur une mesure ; 2e : étend ; 3e : recommence', () => {
    let s = tapBar(null, 4)
    expect(s).toEqual({ a: 4, b: 4, complete: false })
    s = tapBar(s, 7)
    expect(s).toEqual({ a: 4, b: 7, complete: true })
    s = tapBar(s, 2)
    expect(s).toEqual({ a: 2, b: 2, complete: false })
  })
  it('accepte une 2e mesure avant la 1re', () => {
    expect(tapBar(tapBar(null, 6), 3)).toEqual({ a: 3, b: 6, complete: true })
  })
  it('libellés', () => {
    expect(loopLabel({ a: 3, b: 3, complete: false })).toBe('Mesure 4')
    expect(loopLabel({ a: 2, b: 5, complete: true })).toBe('Mesures 3 à 6')
  })
})

describe('tempo', () => {
  it('borne entre 50 et 100 %, par pas de 5', () => {
    expect(clampTempo(40)).toBe(50)
    expect(clampTempo(120)).toBe(100)
    expect(clampTempo(73)).toBe(75)
  })
})
