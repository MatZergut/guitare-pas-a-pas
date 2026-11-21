// @vitest-environment node
import { importer } from '@coderline/alphatab'
import { describe, expect, it } from 'vitest'
import { ensureTablature, foldIntoRange, placeChord } from './tablature'

describe('placeChord', () => {
  it('note seule : case la plus basse', () => {
    expect(placeChord([60])).toEqual([{ string: 5, fret: 1 }]) // Do4 = 2e corde case 1
    expect(placeChord([40])).toEqual([{ string: 1, fret: 0 }]) // Mi grave à vide
    expect(placeChord([64])).toEqual([{ string: 6, fret: 0 }])
  })
  it('accord : une corde par note (Do majeur ouvert C E G C E)', () => {
    const p = placeChord([48, 52, 55, 60, 64])
    expect(new Set(p.map((x) => x!.string)).size).toBe(5)
    expect(p.every((x) => x!.fret <= 3)).toBe(true)
  })
  it('note trop grave : null', () => {
    expect(placeChord([30])).toEqual([null])
  })
})

describe('foldIntoRange', () => {
  it('ramène une note dans la tessiture par octaves', () => {
    expect(foldIntoRange(28)).toBe(40)
    expect(foldIntoRange(96)).toBe(72) // 84 dépasserait la case 19 de la 1re corde (83)
    expect(foldIntoRange(60)).toBe(60)
  })
})

describe('ensureTablature sur un MusicXML sans tablature', () => {
  const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Mélodie</part-name></score-part></part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  <note><pitch><step>C</step><octave>2</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part></score-partwise>`

  it('assigne cordes et cases en gardant les hauteurs', () => {
    const score = importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(xml))
    const staff = score.tracks[0].staves[0]
    expect(staff.isStringed).toBe(false)
    const folded = ensureTablature(staff as never)
    expect(staff.isStringed).toBe(true)
    expect(staff.showTablature).toBe(true)
    const notes = staff.bars[0].voices[0].beats.map((b) => b.notes[0])
    expect(notes.map((n) => n.realValue)).toEqual([60, 64, 67, 48]) // Do2 remonté d'une octave
    expect(notes.map((n) => [n.string, n.fret])).toEqual([[5, 1], [6, 0], [6, 3], [2, 3]])
    expect(folded).toBe(1)
  })
})
