import type { ImportedSong, LessonProgress, PerformanceRecord, PracticeDay, SettingRow } from '../../db/db'

export const BACKUP_FORMAT = 'guitare-pas-a-pas'
export const BACKUP_VERSION = 1

/** Réglages propres à l'appareil : jamais restaurés sur un autre téléphone. */
const DEVICE_SETTINGS = new Set(['latencyMs'])

/** Morceau importé dont le fichier est encodé en base64 pour tenir dans le JSON. */
export type SerializedSong = Omit<ImportedSong, 'data'> & { dataBase64: string }

export interface BackupData {
  lessonProgress: LessonProgress[]
  performances: PerformanceRecord[]
  practice: PracticeDay[]
  settings: SettingRow[]
  songs: SerializedSong[]
}

export interface Backup extends BackupData {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: number
}

export function makeBackup(data: BackupData, now = Date.now()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    ...data,
    settings: data.settings.filter((s) => !DEVICE_SETTINGS.has(s.key)),
    performances: data.performances.map(({ id: _id, ...p }) => p),
  }
}

export class BackupError extends Error {}

const isArr = (x: unknown): x is unknown[] => Array.isArray(x)
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** Lit et vérifie un fichier de sauvegarde. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('Ce fichier n’est pas une sauvegarde GuitarePasÀPas.')
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new BackupError('Ce fichier n’est pas une sauvegarde GuitarePasÀPas.')
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION)
    throw new BackupError('Cette sauvegarde vient d’une version plus récente de l’appli. Mets l’appli à jour puis réessaie.')
  for (const k of ['lessonProgress', 'performances', 'practice', 'settings', 'songs'] as const)
    if (!isArr(raw[k])) throw new BackupError('Sauvegarde incomplète ou abîmée.')
  const b = raw as unknown as Backup
  if (!b.lessonProgress.every((l) => typeof l.lessonId === 'string' && typeof l.bestScore === 'number')) throw new BackupError('Sauvegarde abîmée (leçons).')
  if (!b.performances.every((p) => typeof p.songId === 'string' && typeof p.score === 'number' && typeof p.playedAt === 'number')) throw new BackupError('Sauvegarde abîmée (scores).')
  if (!b.practice.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day) && typeof d.seconds === 'number')) throw new BackupError('Sauvegarde abîmée (pratique).')
  if (!b.songs.every((s) => typeof s.id === 'string' && typeof s.dataBase64 === 'string')) throw new BackupError('Sauvegarde abîmée (morceaux).')
  return b
}

/**
 * Fusionne une sauvegarde avec les données présentes, sans rien perdre :
 * meilleur score par leçon, scores réunis sans doublon, temps de pratique
 * maximal par jour, morceaux ajoutés. Les réglages présents sont conservés.
 */
export function mergeBackup(current: BackupData, incoming: BackupData): BackupData {
  const lessons = new Map(current.lessonProgress.map((l) => [l.lessonId, l]))
  for (const l of incoming.lessonProgress) {
    const c = lessons.get(l.lessonId)
    if (!c) { lessons.set(l.lessonId, l); continue }
    lessons.set(l.lessonId, {
      lessonId: l.lessonId,
      bestScore: Math.max(c.bestScore, l.bestScore),
      attempts: Math.max(c.attempts, l.attempts),
      bestStreak: Math.max(c.bestStreak ?? 0, l.bestStreak ?? 0),
      completedAt: [c.completedAt, l.completedAt].filter((x): x is number => x !== undefined).sort((a, b) => a - b)[0],
      updatedAt: Math.max(c.updatedAt, l.updatedAt),
    })
  }

  const perfKey = (p: PerformanceRecord) => `${p.songId}@${p.playedAt}`
  const perfs = new Map(current.performances.map((p) => [perfKey(p), p]))
  for (const p of incoming.performances) if (!perfs.has(perfKey(p))) perfs.set(perfKey(p), p)

  const practice = new Map(current.practice.map((d) => [d.day, d]))
  for (const d of incoming.practice) practice.set(d.day, { day: d.day, seconds: Math.max(d.seconds, practice.get(d.day)?.seconds ?? 0) })

  const settings = new Map(current.settings.map((s) => [s.key, s]))
  for (const s of incoming.settings) if (!settings.has(s.key) && !DEVICE_SETTINGS.has(s.key)) settings.set(s.key, s)

  const songs = new Map(current.songs.map((s) => [s.id, s]))
  for (const s of incoming.songs) if (!songs.has(s.id)) songs.set(s.id, s)

  return {
    lessonProgress: [...lessons.values()],
    performances: [...perfs.values()],
    practice: [...practice.values()],
    settings: [...settings.values()],
    songs: [...songs.values()],
  }
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `guitare-pas-a-pas-sauvegarde-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

/** Résumé lisible pour la confirmation avant restauration. */
export function describeBackup(b: BackupData): string {
  const done = b.lessonProgress.filter((l) => l.bestScore >= 0.8).length
  const parts = [`${done} leçon${done > 1 ? 's' : ''} réussie${done > 1 ? 's' : ''}`, `${b.performances.length} score${b.performances.length > 1 ? 's' : ''}`]
  if (b.songs.length) parts.push(`${b.songs.length} morceau${b.songs.length > 1 ? 'x' : ''} importé${b.songs.length > 1 ? 's' : ''}`)
  return parts.join(', ')
}
