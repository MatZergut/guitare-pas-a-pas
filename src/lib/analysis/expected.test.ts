// @vitest-environment node
import { importer } from '@coderline/alphatab'
import { describe, expect, it } from 'vitest'
import { builtinTex } from '../../content/songs'
import { expectedNotesFromTrack, ticksToRecordingTime } from './expected'

describe('expectedNotesFromTrack', () => {
  it('Au clair de la lune, mesures 1–2 : Do Do Do Ré Mi Ré aux bons ticks', () => {
    const score = importer.ScoreLoader.loadAlphaTex(builtinTex('au-clair-de-la-lune')!)
    const notes = expectedNotesFromTrack(score.tracks[0], 0, 1)
    expect(notes.map((n) => n.pitch)).toEqual([60, 60, 60, 62, 64, 62])
    expect(notes.map((n) => n.tick)).toEqual([0, 960, 1920, 2880, 3840, 5760])
    expect(notes.map((n) => n.bar)).toEqual([0, 0, 0, 0, 1, 1])
    expect(notes[0].ref.fret).toBe(1)
  })
  it('ignore les silences et numérote les accords note par note', () => {
    const score = importer.ScoreLoader.loadAlphaTex(builtinTex('riff-rock-mi')!)
    const notes = expectedNotesFromTrack(score.tracks[0], 0, 0)
    expect(notes.slice(0, 2).map((n) => n.pitch)).toEqual([40, 47]) // power chord Mi5
    expect(notes.map((n) => n.id)).toEqual(notes.map((_, i) => i))
  })
  it('section au milieu du morceau', () => {
    const score = importer.ScoreLoader.loadAlphaTex(builtinTex('amazing-grace')!)
    const notes = expectedNotesFromTrack(score.tracks[0], 1, 2)
    expect(notes[0].bar).toBe(1)
    expect(notes.at(-1)!.bar).toBe(2)
  })
})

describe('ticksToRecordingTime', () => {
  it('applique la droite, le début d’enregistrement et la latence', () => {
    // 120 bpm : 960 ticks = 500 ms ; lecture démarrée à perf = 3000 ms ; enregistrement à perf = 1000 ms
    expect(ticksToRecordingTime(1920, { a: 3000, b: 500 / 960 }, 1000, 150)).toBeCloseTo(3.15)
  })
})
