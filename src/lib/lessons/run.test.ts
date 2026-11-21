import { describe, expect, it } from 'vitest'
import { positionToMidi } from './positions'
import { seededRandom } from './random'
import { buildRun, drawRounds, fretsToShow, initialRunState, makeChoices, runReducer, runScore, type RunItem, type RunState } from './run'
import type { Lesson } from './types'

const lesson: Lesson = {
  id: 'test', title: 'Test', summary: 's', minutes: 3,
  steps: [
    { type: 'info', title: 'Info', paragraphs: ['x'] },
    { type: 'play', title: 'Joue', notes: [{ string: 6, fret: 0 }, { string: 6, fret: 1 }] },
    { type: 'name', title: 'Nom', pool: { strings: [6], frets: [0, 12], naturalOnly: true }, rounds: 3 },
    { type: 'find', title: 'Trouve', pool: { strings: [5], frets: [0, 12], naturalOnly: true }, rounds: 2 },
  ],
}

describe('buildRun', () => {
  it('déroule info, notes à jouer et questions', () => {
    const items = buildRun(lesson, 42)
    expect(items.map((i) => i.kind)).toEqual(['info', 'play', 'play', 'name', 'name', 'name', 'find', 'find'])
  })
  it('est reproductible avec la même graine', () => {
    expect(buildRun(lesson, 7)).toEqual(buildRun(lesson, 7))
  })
  it('affiche 5 cases si tout y tient, sinon 12', () => {
    expect(fretsToShow([{ string: 6, fret: 3 }])).toBe(5)
    expect(fretsToShow([{ string: 6, fret: 7 }])).toBe(12)
    expect(fretsToShow([{ string: 6, fret: 3 }], 12)).toBe(12)
  })
})

describe('drawRounds', () => {
  it('ne répète jamais deux fois de suite la même hauteur', () => {
    for (let seed = 1; seed < 50; seed++) {
      const rounds = drawRounds({ strings: [6, 5], frets: [0, 12], naturalOnly: true }, 20, seededRandom(seed), 40)
      const midis = [40, ...rounds.map(positionToMidi)]
      midis.forEach((m, i) => i > 0 && expect(m).not.toBe(midis[i - 1]))
    }
  })
  it('couvre toutes les positions avant de répéter', () => {
    const r = drawRounds({ strings: [6], frets: [0, 12], naturalOnly: true }, 8, seededRandom(3))
    expect(new Set(r.map((p) => p.fret)).size).toBe(8)
  })
})

describe('makeChoices', () => {
  it('4 choix, dont la bonne réponse, sans doublon, dans l’ordre de la gamme', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChoices(43, true, seededRandom(seed)) // Sol
      expect(c).toHaveLength(4)
      expect(c.some((x) => x.fr === 'Sol' && x.en === 'G')).toBe(true)
      expect(new Set(c.map((x) => x.pc)).size).toBe(4)
      expect(c.every((x) => !x.fr.includes('♯'))).toBe(true)
      expect([...c].sort((a, b) => a.pc - b.pc)).toEqual(c)
    }
  })
})

describe('makeChoices — cordes à vide', () => {
  it('ne propose que des noms de cordes à vide', () => {
    const open = new Set([4, 9, 2, 7, 11]) // Mi La Ré Sol Si
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChoices(45, false, seededRandom(seed), open)
      expect(c.every((x) => open.has(x.pc))).toBe(true)
      expect(c.some((x) => x.fr === 'La')).toBe(true)
    }
  })
  it('via buildRun, la leçon des cordes à vide n’a aucun dièse dans les choix', () => {
    const l: Lesson = { id: 'o', title: 'o', summary: '', minutes: 3, steps: [
      { type: 'name', title: 'n', pool: { strings: [6, 5, 4, 3, 2, 1], frets: [0, 0] }, rounds: 12 }] }
    for (const it of buildRun(l, 9)) {
      if (it.kind === 'name') expect(it.choices.every((c) => !c.fr.includes('♯'))).toBe(true)
    }
  })
})

describe('runReducer', () => {
  const items = buildRun(lesson, 1)
  const step = (s: RunState, ...actions: Parameters<typeof runReducer>[2][]) =>
    actions.reduce((acc, a) => runReducer(items, acc, a), s)

  it('passe l’écran d’info, compte les réussites au premier essai et la série', () => {
    let s = initialRunState(items.length)
    s = step(s, { type: 'next' }) // info
    s = step(s, { type: 'correct' }, { type: 'next' }) // play 1 ok
    s = step(s, { type: 'wrong' }, { type: 'correct' }, { type: 'next' }) // play 2 : erreur puis juste → raté
    expect(s.results.slice(0, 3)).toEqual([undefined, 'ok', 'fail'])
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(1)
  })

  it('« Quelle est cette note ? » : une seule réponse', () => {
    let s = { ...initialRunState(items.length), index: 3 }
    s = step(s, { type: 'wrong', pc: 2 })
    expect(s.phase).toBe('feedback')
    expect(s.wrongPc).toBe(2)
    expect(step(s, { type: 'correct' })).toBe(s) // ignoré
  })

  it('on ne peut pas avancer sans répondre ; « Passer » compte comme raté', () => {
    let s = { ...initialRunState(items.length), index: 1 }
    expect(step(s, { type: 'next' })).toBe(s)
    s = step(s, { type: 'skip' })
    expect(s.results[1]).toBe('fail')
    expect(s.skipped).toBe(true)
    s = step(s, { type: 'next' })
    expect(s.index).toBe(2)
    expect(s.skipped).toBe(false)
  })

  it('termine et calcule le score', () => {
    let s = initialRunState(items.length)
    s = step(s, { type: 'next' })
    for (let i = 1; i < items.length; i++) s = step(s, i === 4 ? { type: 'skip' } : { type: 'correct' }, { type: 'next' })
    expect(s.done).toBe(true)
    expect(runScore(items, s)).toBeCloseTo(6 / 7)
    expect(s.bestStreak).toBe(3) // série coupée par « Passer »
  })

  it('une leçon sans exercice vaut 100 %', () => {
    const only: RunItem[] = [{ kind: 'info', stepIndex: 0, step: { type: 'info', title: 'x', paragraphs: ['y'] } }]
    const s = runReducer(only, initialRunState(1), { type: 'next' })
    expect(s.done).toBe(true)
    expect(runScore(only, s)).toBe(1)
  })
})
