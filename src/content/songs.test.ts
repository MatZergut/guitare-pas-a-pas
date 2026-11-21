// @vitest-environment node
import { importer, model } from '@coderline/alphatab'
import { describe, expect, it } from 'vitest'
import { barDurationIssues, barTickRange, fretRange, pickGuitarTrack, TICKS_PER_QUARTER } from '../lib/songs/score'
import { BUILTIN_SONGS, builtinTex } from './songs'

const load = (id: string) => importer.ScoreLoader.loadAlphaTex(builtinTex(id)!)

describe('morceaux intégrés', () => {
  it('9 morceaux, niveaux 1 à 5 tous représentés, identifiants uniques', () => {
    expect(BUILTIN_SONGS).toHaveLength(9)
    expect(new Set(BUILTIN_SONGS.map((s) => s.level))).toEqual(new Set([1, 2, 3, 4, 5]))
    expect(new Set(BUILTIN_SONGS.map((s) => s.id)).size).toBe(9)
  })

  for (const song of BUILTIN_SONGS) {
    describe(song.title, () => {
      it('a sa partition alphaTex', () => expect(builtinTex(song.id)).toBeTruthy())
      it('se charge sans erreur, avec le bon titre et une piste de guitare en accordage standard', () => {
        const score = load(song.id)
        expect(score.title).toBe(song.title)
        const track = pickGuitarTrack(score)
        expect(track.staves[0].tuning).toEqual([64, 59, 55, 50, 45, 40])
      })
      it('chaque mesure a exactement la durée de son chiffrage', () => {
        expect(barDurationIssues(pickGuitarTrack(load(song.id)))).toEqual([])
      })
      it('reste dans les 7 premières cases (morceaux pour débuter)', () => {
        const [min, max] = fretRange(pickGuitarTrack(load(song.id)))
        expect(min).toBeGreaterThanOrEqual(0)
        expect(max).toBeLessThanOrEqual(7)
      })
    })
  }

  it('mélodie d’« Au clair de la lune » : Do Do Do Ré Mi Ré', () => {
    const beats = load('au-clair-de-la-lune').tracks[0].staves[0].bars.slice(0, 2).flatMap((b) => b.voices[0].beats)
    expect(beats.map((b) => b.notes[0].realValue)).toEqual([60, 60, 60, 62, 64, 62])
  })
})

describe('barTickRange', () => {
  it('couvre les mesures demandées, dans n’importe quel ordre', () => {
    const score = load('au-clair-de-la-lune')
    const bar = 4 * TICKS_PER_QUARTER
    expect(barTickRange(score, 2, 2)).toEqual({ startTick: 2 * bar, endTick: 3 * bar })
    expect(barTickRange(score, 3, 1)).toEqual({ startTick: bar, endTick: 4 * bar })
  })
  it('gère les mesures à 3 temps', () => {
    const score = load('amazing-grace')
    expect(barTickRange(score, 0, 0).endTick).toBe(3 * TICKS_PER_QUARTER)
  })
})

void model
