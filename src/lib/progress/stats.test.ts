import { describe, expect, it } from 'vitest'
import { dayKey, formatMinutes, lastSevenDays, songProgress, streaks } from './stats'

const today = new Date('2026-11-21T18:00:00')
const days = (...list: [string, number][]) => list.map(([day, min]) => ({ day, seconds: min * 60 }))

describe('dayKey', () => {
  it('format local AAAA-MM-JJ', () => expect(dayKey(new Date('2026-01-05T23:30:00'))).toBe('2026-01-05'))
})

describe('streaks', () => {
  it('compte les jours d’affilée jusqu’à aujourd’hui', () => {
    expect(streaks(days(['2026-11-19', 5], ['2026-11-20', 10], ['2026-11-21', 3]), today)).toEqual({ current: 3, best: 3 })
  })
  it('la série tient encore si on a joué hier mais pas encore aujourd’hui', () => {
    expect(streaks(days(['2026-11-19', 5], ['2026-11-20', 10]), today).current).toBe(2)
  })
  it('une journée manquée casse la série ; la meilleure est gardée', () => {
    expect(streaks(days(['2026-11-10', 5], ['2026-11-11', 5], ['2026-11-12', 5], ['2026-11-13', 5], ['2026-11-21', 5]), today)).toEqual({ current: 1, best: 4 })
  })
  it('moins d’une minute ne compte pas', () => {
    expect(streaks([{ day: '2026-11-21', seconds: 30 }], today)).toEqual({ current: 0, best: 0 })
  })
  it('passe les changements de mois', () => {
    expect(streaks(days(['2026-10-31', 5], ['2026-11-01', 5]), new Date('2026-11-01T10:00:00')).current).toBe(2)
  })
})

describe('lastSevenDays', () => {
  it('7 jours, le plus ancien d’abord, minutes arrondies, aujourd’hui marqué', () => {
    const w = lastSevenDays([{ day: '2026-11-21', seconds: 750 }, { day: '2026-11-15', seconds: 60 }, { day: '2026-11-14', seconds: 600 }], today)
    expect(w).toHaveLength(7)
    expect(w[0]).toMatchObject({ day: '2026-11-15', label: 'dim.', minutes: 1 })
    expect(w[6]).toMatchObject({ day: '2026-11-21', label: 'sam.', minutes: 13, isToday: true })
  })
})

describe('formatMinutes', () => {
  it('minutes et heures', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(95)).toBe('1 h 35')
  })
})

describe('songProgress', () => {
  it('regroupe par morceau, du plus récemment joué au plus ancien', () => {
    const p = songProgress([
      { songId: 'a', score: 40, tempoPercent: 70, topErrors: [], playedAt: 1 },
      { songId: 'b', score: 90, tempoPercent: 70, topErrors: [], playedAt: 5 },
      { songId: 'a', score: 75, tempoPercent: 70, topErrors: [], playedAt: 3 },
    ])
    expect(p.map((s) => s.songId)).toEqual(['b', 'a'])
    expect(p[1]).toMatchObject({ last: 75, best: 75 })
    expect(p[1].scores.map((s) => s.score)).toEqual([40, 75])
  })
})
