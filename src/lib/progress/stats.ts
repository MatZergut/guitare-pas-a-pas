import type { PerformanceRecord, PracticeDay } from '../../db/db'

/** « AAAA-MM-JJ » en heure locale. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Seuil pour qu'une journée compte comme « pratiquée ». */
export const MIN_PRACTICE_SECONDS = 60

/**
 * Jours de pratique d'affilée. La série en cours reste valable si on n'a pas
 * encore joué aujourd'hui mais qu'on a joué hier.
 */
export function streaks(days: PracticeDay[], today: Date): { current: number; best: number } {
  const set = new Set(days.filter((d) => d.seconds >= MIN_PRACTICE_SECONDS).map((d) => d.day))
  let current = 0
  let cursor = set.has(dayKey(today)) ? today : addDays(today, -1)
  while (set.has(dayKey(cursor))) { current++; cursor = addDays(cursor, -1) }

  let best = 0
  for (const day of set) {
    const prev = dayKey(addDays(new Date(`${day}T12:00:00`), -1))
    if (set.has(prev)) continue // pas le début d'une série
    let len = 0
    let c = new Date(`${day}T12:00:00`)
    while (set.has(dayKey(c))) { len++; c = addDays(c, 1) }
    best = Math.max(best, len)
  }
  return { current, best: Math.max(best, current) }
}

const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

export interface DayBar { day: string; label: string; minutes: number; isToday: boolean }

/** Les 7 derniers jours (le plus ancien d'abord), en minutes arrondies. */
export function lastSevenDays(days: PracticeDay[], today: Date): DayBar[] {
  const byDay = new Map(days.map((d) => [d.day, d.seconds]))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6)
    const key = dayKey(d)
    return { day: key, label: WEEKDAYS[d.getDay()], minutes: Math.round((byDay.get(key) ?? 0) / 60), isToday: i === 6 }
  })
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export interface SongProgress {
  songId: string
  scores: { score: number; playedAt: number }[]
  last: number
  best: number
}

/** Historique des scores regroupé par morceau, du plus récemment joué au plus ancien. */
export function songProgress(perfs: PerformanceRecord[]): SongProgress[] {
  const map = new Map<string, { score: number; playedAt: number }[]>()
  for (const p of perfs) {
    const list = map.get(p.songId) ?? []
    list.push({ score: p.score, playedAt: p.playedAt })
    map.set(p.songId, list)
  }
  return [...map].map(([songId, scores]) => {
    scores.sort((a, b) => a.playedAt - b.playedAt)
    return { songId, scores, last: scores[scores.length - 1].score, best: Math.max(...scores.map((s) => s.score)) }
  }).sort((a, b) => b.scores[b.scores.length - 1].playedAt - a.scores[a.scores.length - 1].playedAt)
}
