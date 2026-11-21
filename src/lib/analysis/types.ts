/** Note attendue, extraite de la partition. Temps en secondes depuis le début de l'enregistrement. */
export interface ExpectedNote {
  id: number
  pitch: number
  time: number
  /** Indice de mesure (0 = première mesure du morceau). */
  bar: number
}

/** Note entendue, issue de la transcription (Basic Pitch). */
export interface PlayedNote {
  pitch: number
  onset: number
  duration: number
  amplitude: number
}

export type Verdict =
  | { kind: 'ok'; played: PlayedNote; deltaMs: number }
  | { kind: 'early' | 'late'; played: PlayedNote; deltaMs: number }
  /** Mauvaise hauteur ; `semitones` > 0 = trop aigu. */
  | { kind: 'wrong'; played: PlayedNote; semitones: number; deltaMs: number }
  | { kind: 'missed' }

export interface NoteResult {
  expected: ExpectedNote
  verdict: Verdict
  /** La note fait partie d'un accord joué incomplètement. */
  incompleteChord: boolean
}

export type MistakeKind = 'wrong' | 'missed' | 'extra' | 'early' | 'late' | 'incomplete'

export interface Mistake {
  kind: MistakeKind
  count: number
  label: string
}

export interface AnalysisResult {
  notes: NoteResult[]
  extras: PlayedNote[]
  /** 0..100 */
  score: number
  /** Les erreurs les plus fréquentes, de la plus fréquente à la moins fréquente. */
  mistakes: Mistake[]
  /** Score 0..1 par mesure (indice de mesure → score). */
  barScores: Map<number, number>
  /** Mesure la plus faible (null si tout est juste). */
  weakestBar: number | null
}

export interface AnalysisOptions {
  /** Seuil en avance / en retard (ms). */
  timingToleranceMs: number
}

export const DEFAULT_ANALYSIS: AnalysisOptions = { timingToleranceMs: 80 }
