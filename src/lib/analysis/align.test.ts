import { describe, expect, it } from 'vitest'
import { analyzePerformance, clusterPlayed, groupExpected } from './align'
import type { ExpectedNote, PlayedNote } from './types'

/** Mélodie de 16 noires à 120 bpm (0,5 s), 4 par mesure. */
const melody = (pitches = [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72, 67, 64, 62, 60]): ExpectedNote[] =>
  pitches.map((pitch, i) => ({ id: i, pitch, time: 1 + i * 0.5, bar: Math.floor(i / 4) }))

const play = (exp: ExpectedNote[], f: (n: ExpectedNote, i: number) => Partial<PlayedNote> | null = () => ({})): PlayedNote[] =>
  exp.flatMap((n, i) => {
    const m = f(n, i)
    return m === null ? [] : [{ pitch: n.pitch, onset: n.time, duration: 0.45, amplitude: 0.7, ...m }]
  })

describe('regroupements', () => {
  it('regroupe un accord attendu et un accord gratté', () => {
    expect(groupExpected([{ id: 0, pitch: 40, time: 1, bar: 0 }, { id: 1, pitch: 47, time: 1, bar: 0 }, { id: 2, pitch: 52, time: 1.5, bar: 0 }])).toHaveLength(2)
    const c = clusterPlayed([40, 47, 52].map((p, i) => ({ pitch: p, onset: 1 + i * 0.02, duration: 1, amplitude: 0.7 })))
    expect(c).toHaveLength(1)
    expect(c[0].notes).toHaveLength(3)
  })
})

describe('analyzePerformance', () => {
  it('jeu parfait : 100, aucune erreur', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e))
    expect(r.score).toBe(100)
    expect(r.mistakes).toEqual([])
    expect(r.weakestBar).toBeNull()
  })

  it('tolère une dérive de tempo de 5 % (tout est apparié, rien d’oublié)', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n) => ({ onset: 1 + (n.time - 1) * 1.05 })))
    expect(r.notes.every((x) => x.verdict.kind !== 'missed' && x.verdict.kind !== 'wrong')).toBe(true)
    expect(r.extras).toHaveLength(0)
    expect(r.notes.at(-1)!.verdict.kind).toBe('late') // la fin a dérivé de 375 ms
  })

  it('fausse note : 1 demi-ton trop haut', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n, i) => (i === 5 ? { pitch: n.pitch + 1 } : {})))
    const w = r.notes[5].verdict
    expect(w.kind).toBe('wrong')
    expect(w.kind === 'wrong' && w.semitones).toBe(1)
    expect(r.mistakes[0].label).toBe('1 fausse note (en général 1 demi-ton trop haut)')
    expect(r.weakestBar).toBe(1)
  })

  it('note oubliée et note en trop', () => {
    const e = melody()
    const played = play(e, (_, i) => (i === 3 ? null : {}))
    played.push({ pitch: 50, onset: 4.25, duration: 0.2, amplitude: 0.7 })
    const r = analyzePerformance(e, played)
    expect(r.notes[3].verdict.kind).toBe('missed')
    expect(r.extras.map((x) => x.pitch)).toEqual([50])
    expect(r.mistakes.map((m) => m.kind).sort()).toEqual(['extra', 'missed'])
    expect(r.score).toBe(Math.round((100 * 15) / (16 + 0.5)))
  })

  it('en avance / en retard au-delà de 80 ms (comptent pour moitié)', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n, i) => (i === 2 ? { onset: n.time - 0.12 } : i === 9 ? { onset: n.time + 0.15 } : i === 4 ? { onset: n.time + 0.07 } : {})))
    expect(r.notes[2].verdict).toMatchObject({ kind: 'early', deltaMs: -120 })
    expect(r.notes[9].verdict).toMatchObject({ kind: 'late', deltaMs: 150 })
    expect(r.notes[4].verdict.kind).toBe('ok')
    expect(r.score).toBe(Math.round((100 * 15) / 16))
  })

  it('seuil réglable', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n, i) => (i === 2 ? { onset: n.time + 0.07 } : {})), { timingToleranceMs: 50 })
    expect(r.notes[2].verdict.kind).toBe('late')
  })

  it('fausses notes très éloignées : conseil de vérifier corde et case', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n, i) => (i < 3 ? { pitch: n.pitch - 7 } : {})))
    expect(r.mistakes[0].label).toBe('3 fausses notes (souvent loin de la bonne note : vérifie la corde et la case)')
  })

  it('accord incomplet', () => {
    const e: ExpectedNote[] = [40, 47, 52].map((p, i) => ({ id: i, pitch: p, time: 1, bar: 0 }))
    const r = analyzePerformance(e, [40, 47].map((p) => ({ pitch: p, onset: 1.01, duration: 1, amplitude: 0.7 })))
    expect(r.notes.every((x) => x.incompleteChord)).toBe(true)
    expect(r.notes.find((x) => x.expected.pitch === 52)!.verdict.kind).toBe('missed')
    expect(r.mistakes.map((m) => m.label)).toContain('1 accord incomplet')
  })

  it('une harmonique de la note jouée n’est pas une note en trop', () => {
    const e = melody()
    const played = play(e)
    played.push({ pitch: 72, onset: 1.02, duration: 0.3, amplitude: 0.5 }) // octave du Do joué
    expect(analyzePerformance(e, played).extras).toHaveLength(0)
  })

  it('décalage constant (latence non compensée) : les notes restent appariées', () => {
    const e = melody()
    const r = analyzePerformance(e, play(e, (n) => ({ onset: n.time + 0.2 })))
    expect(r.notes.every((x) => x.verdict.kind === 'late')).toBe(true)
  })

  it('silence total : tout est oublié, score 0', () => {
    const r = analyzePerformance(melody(), [])
    expect(r.score).toBe(0)
    expect(r.mistakes[0]).toMatchObject({ kind: 'missed', count: 16 })
    expect(r.weakestBar).toBe(0)
  })

  it('classe les erreurs de la plus fréquente à la moins fréquente (3 max)', () => {
    const e = melody()
    const played = play(e, (n, i) => (i < 4 ? { pitch: n.pitch - 2 } : i < 6 ? null : i === 6 ? { onset: n.time + 0.2 } : {}))
    played.push({ pitch: 30, onset: 9.25, duration: 0.2, amplitude: 0.7 })
    const r = analyzePerformance(e, played)
    expect(r.mistakes.map((m) => m.kind)).toEqual(['wrong', 'missed', 'extra'])
    expect(r.mistakes[0].label).toBe('4 fausses notes (en général 2 demi-tons trop bas)')
  })
})
