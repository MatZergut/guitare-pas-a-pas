import { describe, expect, it } from 'vitest'
import { buildRun } from '../lib/lessons/run'
import { validateContent } from '../lib/lessons/validate'
import { LESSON_CONTENT, LESSONS } from './lessons'

describe('contenu des leçons', () => {
  it('est valide', () => {
    expect(validateContent(LESSON_CONTENT)).toEqual([])
  })
  it('suit le parcours prévu', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([
      'tenir-la-guitare', 'cordes-a-vide', 'les-cases', 'notes-corde-mi', 'notes-corde-la',
      'jeu-mi-la', 'cordes-re-sol', 'cordes-si-mi', 'tout-le-manche',
    ])
  })
  it('chaque leçon se déroule et contient au moins un exercice', () => {
    for (const l of LESSONS) {
      const items = buildRun(l, 1)
      expect(items.some((i) => i.kind !== 'info'), l.id).toBe(true)
    }
  })
  it('le validateur détecte les erreurs', () => {
    const bad = structuredClone(LESSON_CONTENT)
    bad.lessons[1].id = bad.lessons[0].id
    bad.lessons[2].steps.push({ type: 'play', title: 'x', notes: [{ string: 7 as 1, fret: 20 }] })
    const errors = validateContent(bad)
    expect(errors.some((e) => e.includes('en double'))).toBe(true)
    expect(errors.some((e) => e.includes('corde 7'))).toBe(true)
    expect(errors.some((e) => e.includes('case 20'))).toBe(true)
  })
})
