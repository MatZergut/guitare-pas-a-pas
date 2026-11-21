import { describe, expect, it } from 'vitest'
import { centsBetween, formatNote, freqToMidi, midiToFreq, midiToNoteName } from './notes'
import { TUNINGS } from './tunings'

describe('notes', () => {
  it('convertit MIDI ↔ fréquence', () => {
    expect(midiToFreq(69)).toBe(440)
    expect(midiToFreq(40)).toBeCloseTo(82.407, 3) // Mi grave
    expect(midiToFreq(69, 432)).toBe(432)
    expect(freqToMidi(110)).toBeCloseTo(45, 10)
    expect(freqToMidi(midiToFreq(52.3))).toBeCloseTo(52.3, 10)
  })

  it('calcule les cents', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200)
    expect(centsBetween(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10)
    expect(centsBetween(435, 440)).toBeLessThan(0)
  })

  it('nomme les notes en français et en anglais', () => {
    expect(midiToNoteName(40)).toEqual({ fr: 'Mi', en: 'E', octave: 2, midi: 40 })
    expect(midiToNoteName(61)).toMatchObject({ fr: 'Do♯', en: 'C♯', octave: 4 })
    expect(midiToNoteName(59.6).fr).toBe('Do') // arrondi au demi-ton le plus proche
    expect(formatNote(midiToNoteName(45))).toBe('La (A)')
  })

  it('accordage standard = E2 A2 D3 G3 B3 E4', () => {
    const names = TUNINGS.standard.strings.map((m) => { const n = midiToNoteName(m); return n.en + n.octave })
    expect(names).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(TUNINGS.dropD.strings.map((m) => midiToNoteName(m).fr)).toEqual(['Ré', 'La', 'Ré', 'Sol', 'Si', 'Mi'])
    expect(TUNINGS.openG.strings.map((m) => midiToNoteName(m).fr)).toEqual(['Ré', 'Sol', 'Ré', 'Sol', 'Si', 'Ré'])
  })
})
