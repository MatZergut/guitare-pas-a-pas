import { MAX_FRET, poolPositions, positionToMidi } from './positions'
import type { LessonContent, Position, QuizPool } from './types'

/** Vérifie le contenu des leçons et renvoie la liste des problèmes (vide = OK). */
export function validateContent(content: LessonContent): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const checkPos = (where: string, p: Position) => {
    if (![1, 2, 3, 4, 5, 6].includes(p.string)) errors.push(`${where} : corde ${p.string} invalide`)
    if (!Number.isInteger(p.fret) || p.fret < 0 || p.fret > MAX_FRET) errors.push(`${where} : case ${p.fret} invalide`)
  }
  const checkPool = (where: string, pool: QuizPool) => {
    pool.strings.forEach((s) => checkPos(where, { string: s, fret: pool.frets[0] }))
    if (pool.frets[0] > pool.frets[1] || pool.frets[1] > MAX_FRET) errors.push(`${where} : plage de cases invalide`)
    if (poolPositions(pool).length < 2) errors.push(`${where} : pas assez de positions`)
  }

  if (!content.lessons.length) errors.push('aucune leçon')
  content.lessons.forEach((l) => {
    if (!/^[a-z0-9-]+$/.test(l.id)) errors.push(`${l.id} : identifiant invalide`)
    if (ids.has(l.id)) errors.push(`${l.id} : identifiant en double`)
    ids.add(l.id)
    if (!l.title || !l.summary) errors.push(`${l.id} : titre ou résumé manquant`)
    if (l.minutes < 3 || l.minutes > 5) errors.push(`${l.id} : durée hors 3–5 min`)
    if (!l.steps.length) errors.push(`${l.id} : aucune étape`)
    let lastPlayed: number | null = null
    l.steps.forEach((s, i) => {
      const where = `${l.id} étape ${i + 1}`
      if (!s.title) errors.push(`${where} : titre manquant`)
      switch (s.type) {
        case 'info':
          if (!s.paragraphs.length) errors.push(`${where} : texte manquant`)
          s.show?.forEach((p) => checkPos(where, p))
          break
        case 'play':
          if (!s.notes.length) errors.push(`${where} : aucune note`)
          s.notes.forEach((p) => checkPos(where, p))
          // Deux fois la même hauteur d'affilée : la note qui résonne bloquerait la suivante.
          s.notes.forEach((p, j) => {
            const m = positionToMidi(p)
            if (m === lastPlayed) errors.push(`${where} : deux fois la même hauteur d'affilée (note ${j + 1})`)
            lastPlayed = m
          })
          break
        case 'find':
        case 'name':
          checkPool(where, s.pool)
          if (s.rounds < 1 || s.rounds > 20) errors.push(`${where} : nombre de questions invalide`)
          lastPlayed = null // les questions tirées évitent d'elles-mêmes la note précédente
          break
        default:
          errors.push(`${where} : type inconnu`)
      }
    })
  })
  return errors
}
