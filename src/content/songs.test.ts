// @vitest-environment node
import { importer, model } from '@coderline/alphatab'
import { describe, expect, it } from 'vitest'
import { barDurationIssues, barTickRange, fretRange, pickGuitarTrack, TICKS_PER_QUARTER } from '../lib/songs/score'
import { BUILTIN_SONGS, builtinTex } from './songs'

const load = (id: string) => importer.ScoreLoader.loadAlphaTex(builtinTex(id)!)

describe('morceaux intégrés', () => {
  it('20 morceaux : exactement 4 par niveau, identifiants uniques', () => {
    expect(BUILTIN_SONGS).toHaveLength(20)
    for (let l = 1; l <= 5; l++) expect(BUILTIN_SONGS.filter((s) => s.level === l), `niveau ${l}`).toHaveLength(4)
    expect(new Set(BUILTIN_SONGS.map((s) => s.id)).size).toBe(20)
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

  const melody = (id: string, bars: number) =>
    load(id).tracks[0].staves[0].bars.slice(0, bars).flatMap((b) => b.voices[0].beats).filter((b) => !b.isRest).map((b) => b.notes[0].realValue)

  it('début de « Lettre à Élise » : Mi Ré♯ Mi Ré♯ Mi Si Ré Do La', () => {
    expect(melody('lettre-a-elise', 3).slice(0, 9)).toEqual([64, 63, 64, 63, 64, 59, 62, 60, 57])
  })

  it('début de « Ah ! vous dirai-je, maman » : Sol Sol Ré Ré Mi Mi Ré (en Sol)', () => {
    expect(melody('ah-vous-dirai-je-maman', 2)).toEqual([55, 55, 62, 62, 64, 64, 62])
  })

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
