import Dexie, { type EntityTable } from 'dexie'

/** Progression d'une leçon (module 2). */
export interface LessonProgress {
  lessonId: string
  /** Meilleur taux de réussite, 0..1. La leçon suivante se débloque à 0.8. */
  bestScore: number
  attempts: number
  /** Meilleure série de bonnes réponses d’affilée. */
  bestStreak?: number
  completedAt?: number
  updatedAt: number
}

export type SongFormat = 'gp' | 'gp3' | 'gp4' | 'gp5' | 'gpx' | 'musicxml' | 'alphatex'

/** Morceau importé par l'utilisateur (module 3). Le fichier reste sur l'appareil. */
export interface ImportedSong {
  /** « import:<uuid> » — les morceaux intégrés utilisent « builtin:<slug> ». */
  id: string
  title: string
  artist?: string
  fileName: string
  format: SongFormat
  data: Blob
  level?: 1 | 2 | 3 | 4 | 5
  importedAt: number
}

/** Résultat d'une analyse de jeu (module 4). */
export interface PerformanceRecord {
  id?: number
  songId: string
  /** Score global 0..100 */
  score: number
  tempoPercent: number
  barRange?: [number, number]
  topErrors: string[]
  playedAt: number
}

/** Temps de pratique cumulé par jour (heure locale). */
export interface PracticeDay {
  /** « AAAA-MM-JJ » */
  day: string
  seconds: number
}

/** Réglages clé/valeur (diapason, accordage, latence calibrée de cet appareil…). */
export interface SettingRow {
  key: string
  value: unknown
}

export class GuitareDB extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>
  songs!: EntityTable<ImportedSong, 'id'>
  performances!: EntityTable<PerformanceRecord, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  practice!: EntityTable<PracticeDay, 'day'>

  constructor(name = 'guitare-pas-a-pas') {
    super(name)
    this.version(1).stores({
      lessonProgress: 'lessonId, updatedAt',
      songs: 'id, title, level, importedAt',
      performances: '++id, songId, playedAt, [songId+playedAt]',
      settings: 'key',
    })
    // v2 : temps de pratique par jour (onglet Progrès)
    this.version(2).stores({ practice: 'day' })
  }
}

export const db = new GuitareDB()
