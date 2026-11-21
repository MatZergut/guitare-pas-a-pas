import { NOTE_NAMES_EN, NOTE_NAMES_FR } from '../music/notes'
import { isNatural, poolPositions, positionToMidi } from './positions'
import { seededRandom, shuffle } from './random'
import type { InfoStep, Lesson, Position, QuizPool } from './types'

/** Un nom de note proposé dans le jeu « Quelle est cette note ? ». */
export interface Choice {
  /** Classe de hauteur 0..11 (0 = Do). */
  pc: number
  fr: string
  en: string
}

export type RunItem =
  | { kind: 'info'; stepIndex: number; step: InfoStep }
  | { kind: 'play' | 'find'; stepIndex: number; title: string; text?: string; position: Position; midi: number; frets: number }
  | { kind: 'name'; stepIndex: number; title: string; text?: string; position: Position; midi: number; frets: number; choices: Choice[] }

export const NUM_CHOICES = 4

function choiceFor(pc: number): Choice {
  return { pc, fr: NOTE_NAMES_FR[pc], en: NOTE_NAMES_EN[pc] }
}

/** Cases affichées : 5 si tout tient dedans (plus lisible), sinon 12. */
export function fretsToShow(positions: Position[], explicit?: number): number {
  if (explicit) return explicit
  return Math.max(0, ...positions.map((p) => p.fret)) <= 5 ? 5 : 12
}

/** Tire `rounds` positions sans répéter deux fois de suite la même hauteur (sinon la note qui résonne validerait la suivante). */
export function drawRounds(pool: QuizPool, rounds: number, rand: () => number, previousMidi?: number): Position[] {
  const all = poolPositions(pool)
  if (all.length === 0) return []
  const out: Position[] = []
  let bag: Position[] = []
  let last = previousMidi
  while (out.length < rounds) {
    if (bag.length === 0) bag = shuffle(all, rand)
    let i = bag.findIndex((p) => positionToMidi(p) !== last)
    if (i < 0) {
      // Il ne reste que la même hauteur : on entame le paquet suivant.
      bag = bag.concat(shuffle(all, rand))
      i = bag.findIndex((p) => positionToMidi(p) !== last)
    }
    const [p] = bag.splice(i, 1)
    out.push(p)
    last = positionToMidi(p)
  }
  return out
}

export function makeChoices(midi: number, naturalOnly: boolean, rand: () => number): Choice[] {
  const pc = ((midi % 12) + 12) % 12
  const candidates = Array.from({ length: 12 }, (_, i) => i).filter((c) => c !== pc && (!naturalOnly || isNatural(c)))
  const distractors = shuffle(candidates, rand).slice(0, NUM_CHOICES - 1)
  // Ordre de la gamme (Do Ré Mi…) : plus facile à parcourir que du hasard.
  return [pc, ...distractors].sort((a, b) => a - b).map(choiceFor)
}

/** Déroule une leçon en une liste d'écrans. */
export function buildRun(lesson: Lesson, seed = Date.now()): RunItem[] {
  const rand = seededRandom(seed)
  const items: RunItem[] = []
  let lastMidi: number | undefined
  lesson.steps.forEach((step, stepIndex) => {
    switch (step.type) {
      case 'info':
        items.push({ kind: 'info', stepIndex, step })
        break
      case 'play': {
        const frets = fretsToShow(step.notes, step.frets)
        for (const position of step.notes) {
          lastMidi = positionToMidi(position)
          items.push({ kind: 'play', stepIndex, title: step.title, text: step.text, position, midi: lastMidi, frets })
        }
        break
      }
      case 'find':
      case 'name': {
        const positions = drawRounds(step.pool, step.rounds, rand, lastMidi)
        const frets = step.frets ?? fretsToShow(poolPositions(step.pool))
        for (const position of positions) {
          const midi = positionToMidi(position)
          lastMidi = midi
          if (step.type === 'find') {
            items.push({ kind: 'find', stepIndex, title: step.title, text: step.text, position, midi, frets })
          } else {
            const choices = makeChoices(midi, !!step.pool.naturalOnly, rand)
            items.push({ kind: 'name', stepIndex, title: step.title, text: step.text, position, midi, frets, choices })
          }
        }
        break
      }
    }
  })
  return items
}

export function isScored(item: RunItem): boolean {
  return item.kind !== 'info'
}

// ---------- Déroulé (réducteur pur) ----------

export type ItemResult = 'ok' | 'fail'

export interface RunState {
  index: number
  /** asking = on attend la réponse ; feedback = réponse donnée, on montre le résultat. */
  phase: 'asking' | 'feedback'
  results: (ItemResult | undefined)[]
  /** Une erreur a déjà été faite sur l'écran en cours (le premier essai compte). */
  missed: boolean
  /** Dernière réponse fausse (classe de hauteur), pour l'afficher en rouge. */
  wrongPc: number | null
  skipped: boolean
  streak: number
  bestStreak: number
  done: boolean
}

export type RunAction =
  | { type: 'correct' }
  | { type: 'wrong'; pc?: number }
  | { type: 'skip' }
  | { type: 'next' }

export function initialRunState(length: number): RunState {
  return { index: 0, phase: 'asking', results: Array(length).fill(undefined), missed: false, wrongPc: null, skipped: false, streak: 0, bestStreak: 0, done: length === 0 }
}

export function runReducer(items: RunItem[], s: RunState, a: RunAction): RunState {
  if (s.done) return s
  const item = items[s.index]
  switch (a.type) {
    case 'correct': {
      if (s.phase !== 'asking' || !isScored(item)) return s
      const ok = !s.missed
      const streak = ok ? s.streak + 1 : 0
      const results = [...s.results]
      results[s.index] = ok ? 'ok' : 'fail'
      return { ...s, phase: 'feedback', results, streak, bestStreak: Math.max(s.bestStreak, streak) }
    }
    case 'wrong': {
      if (s.phase !== 'asking' || !isScored(item)) return s
      // Dans « Quelle est cette note ? » une seule réponse est permise.
      if (item.kind === 'name') {
        const results = [...s.results]
        results[s.index] = 'fail'
        return { ...s, phase: 'feedback', results, missed: true, wrongPc: a.pc ?? null, streak: 0 }
      }
      return { ...s, missed: true, streak: 0 }
    }
    case 'skip': {
      if (s.phase !== 'asking' || !isScored(item)) return s
      const results = [...s.results]
      results[s.index] = 'fail'
      return { ...s, phase: 'feedback', results, skipped: true, streak: 0 }
    }
    case 'next': {
      if (s.phase === 'asking' && isScored(item)) return s
      const index = s.index + 1
      if (index >= items.length) return { ...s, done: true }
      return { ...s, index, phase: 'asking', missed: false, wrongPc: null, skipped: false }
    }
  }
}

/** Score 0..1 sur les écrans notés. Une leçon sans exercice vaut 1 une fois terminée. */
export function runScore(items: RunItem[], s: RunState): number {
  const scored = items.map((it, i) => (isScored(it) ? s.results[i] : null)).filter((r) => r !== null)
  if (scored.length === 0) return 1
  return scored.filter((r) => r === 'ok').length / scored.length
}
