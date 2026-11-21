/**
 * Schéma du contenu des leçons (src/content/lessons.json).
 * Les cordes sont numérotées à la française : 1 = Mi aigu, 6 = Mi grave.
 */

export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6

export interface Position {
  string: StringNumber
  fret: number
}

/** Écran d'explication. */
export interface InfoStep {
  type: 'info'
  title: string
  paragraphs: string[]
  /** Positions mises en évidence sur le manche, avec leur nom affiché. */
  show?: Position[]
  frets?: number
}

/** Jouer une suite de notes montrées sur le manche. */
export interface PlayStep {
  type: 'play'
  title: string
  text?: string
  notes: Position[]
  frets?: number
}

/** Ensemble de positions dans lequel les jeux tirent leurs questions. */
export interface QuizPool {
  strings: StringNumber[]
  /** Case min et max (incluses). */
  frets: [number, number]
  /** Seulement les notes naturelles (sans ♯). */
  naturalOnly?: boolean
}

/** Jeu « Trouve la note » : on donne le nom et la corde, il faut la jouer. */
export interface FindStep {
  type: 'find'
  title: string
  text?: string
  pool: QuizPool
  rounds: number
  frets?: number
}

/** Jeu « Quelle est cette note ? » : on montre une position, il faut toucher le bon nom. */
export interface NameStep {
  type: 'name'
  title: string
  text?: string
  pool: QuizPool
  rounds: number
  frets?: number
}

export type LessonStep = InfoStep | PlayStep | FindStep | NameStep

export interface Lesson {
  id: string
  title: string
  summary: string
  minutes: number
  steps: LessonStep[]
}

export interface LessonContent {
  version: number
  lessons: Lesson[]
}
