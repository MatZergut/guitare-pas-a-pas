import { isHarmonicOf } from './cleanup'
import {
  DEFAULT_ANALYSIS, type AnalysisOptions, type AnalysisResult, type ExpectedNote, type Mistake,
  type MistakeKind, type NoteResult, type PlayedNote,
} from './types'

/** Événement attendu : une note ou un accord (notes de même attaque). */
export interface ExpectedEvent { time: number; notes: ExpectedNote[] }
/** Groupe de notes jouées quasi simultanément. */
export interface PlayedCluster { time: number; notes: PlayedNote[] }

export function groupExpected(notes: ExpectedNote[], window = 0.03): ExpectedEvent[] {
  const sorted = [...notes].sort((a, b) => a.time - b.time)
  const out: ExpectedEvent[] = []
  for (const n of sorted) {
    const last = out[out.length - 1]
    if (last && n.time - last.time <= window) last.notes.push(n)
    else out.push({ time: n.time, notes: [n] })
  }
  return out
}

/** Regroupe les notes jouées en accords (un accord gratté s'étale sur quelques dizaines de ms). */
export function clusterPlayed(notes: PlayedNote[], window = 0.06): PlayedCluster[] {
  const sorted = [...notes].sort((a, b) => a.onset - b.onset)
  const out: PlayedCluster[] = []
  for (const n of sorted) {
    const last = out[out.length - 1]
    if (last && n.onset - last.time <= window) last.notes.push(n)
    else out.push({ time: n.onset, notes: [n] })
  }
  return out
}

// Coûts de l'alignement (unités arbitraires, par note).
const MISS_COST = 1.0
const EXTRA_COST = 0.6
const PITCH_MISMATCH = 0.8
const PITCH_EXTRA = 0.3
/** Coût temporel quadratique : les petits écarts coûtent peu, les grands beaucoup. */
const ROUGH_TIME_SCALE = 0.35 // 1re passe : tolère une dérive progressive, pas un décalage d’un temps entier
const FINE_TIME_SCALE = 0.25 // 2e passe : 250 ms d'écart à la dérive locale ≈ 1 point

function pitchOverlap(e: ExpectedEvent, c: PlayedCluster): number {
  const pool = c.notes.map((n) => n.pitch)
  let k = 0
  for (const n of e.notes) {
    const i = pool.indexOf(n.pitch)
    if (i >= 0) { k++; pool.splice(i, 1) }
  }
  return k
}

function matchCost(e: ExpectedEvent, c: PlayedCluster, offset: number, maxDt: number, timeScale: number): number {
  const dt = c.time - e.time - offset
  if (Math.abs(dt) > maxDt) return Infinity
  const k = pitchOverlap(e, c)
  return (e.notes.length - k) * PITCH_MISMATCH + Math.max(0, c.notes.length - k) * PITCH_EXTRA + (dt / timeScale) ** 2
}

export type Pair = [number | null, number | null]

/**
 * Alignement par programmation dynamique (type Needleman-Wunsch / DTW sur
 * événements) : chaque événement attendu est apparié à au plus un groupe joué,
 * dans l'ordre, ou marqué manqué ; les groupes non appariés sont en trop.
 * `offsetAt(t)` donne le décalage temporel local attendu (dérive de tempo).
 */
export function alignEvents(events: ExpectedEvent[], clusters: PlayedCluster[], offsetAt: (t: number) => number, maxDt: number, timeScale = FINE_TIME_SCALE): Pair[] {
  const n = events.length
  const m = clusters.length
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity))
  const B: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0)) // 0 diag, 1 miss, 2 extra
  D[0][0] = 0
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue
      let best = Infinity
      let move = 0
      if (i > 0 && j > 0) {
        const c = D[i - 1][j - 1] + matchCost(events[i - 1], clusters[j - 1], offsetAt(events[i - 1].time), maxDt, timeScale)
        if (c < best) { best = c; move = 0 }
      }
      if (i > 0) {
        const c = D[i - 1][j] + MISS_COST * events[i - 1].notes.length
        if (c < best) { best = c; move = 1 }
      }
      if (j > 0) {
        const c = D[i][j - 1] + EXTRA_COST * clusters[j - 1].notes.length
        if (c < best) { best = c; move = 2 }
      }
      D[i][j] = best
      B[i][j] = move
    }
  }
  const pairs: Pair[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const move = B[i][j]
    if (i > 0 && j > 0 && move === 0) { pairs.push([i - 1, j - 1]); i--; j-- }
    else if (i > 0 && (move === 1 || j === 0)) { pairs.push([i - 1, null]); i-- }
    else { pairs.push([null, j - 1]); j-- }
  }
  return pairs.reverse()
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const k = s.length >> 1
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2
}

/** Décalage local : médiane des écarts des appariements fiables proches dans le temps. */
export function localOffsets(events: ExpectedEvent[], clusters: PlayedCluster[], pairs: Pair[], radius = 2): (t: number) => number {
  const pts = pairs
    .filter((p): p is [number, number] => p[0] !== null && p[1] !== null && pitchOverlap(events[p[0]], clusters[p[1]]) > 0)
    .map(([i, j]) => ({ t: events[i].time, dt: clusters[j].time - events[i].time }))
  const global = median(pts.map((p) => p.dt))
  return (t) => {
    const near = pts.filter((p) => Math.abs(p.t - t) <= radius)
    return near.length >= 3 ? median(near.map((p) => p.dt)) : global
  }
}

/** Analyse complète : alignement en deux passes, verdict par note, score. */
export function analyzePerformance(expected: ExpectedNote[], played: PlayedNote[], options: Partial<AnalysisOptions> = {}): AnalysisResult {
  const o = { ...DEFAULT_ANALYSIS, ...options }
  const events = groupExpected(expected)
  const clusters = clusterPlayed(played)
  // 1re passe : large tolérance pour trouver la tendance ; 2e passe : affinée autour de la dérive locale.
  const rough = alignEvents(events, clusters, () => 0, 0.6, ROUGH_TIME_SCALE)
  const pairs = alignEvents(events, clusters, localOffsets(events, clusters, rough), 0.35)

  const results: NoteResult[] = []
  const extras: PlayedNote[] = []
  const sounding: PlayedNote[] = []

  for (const [i, j] of pairs) {
    if (i === null) { extras.push(...clusters[j!].notes); continue }
    const ev = events[i]
    if (j === null) {
      for (const n of ev.notes) results.push({ expected: n, verdict: { kind: 'missed' }, incompleteChord: false })
      continue
    }
    const pool = [...clusters[j].notes]
    const local: NoteResult[] = []
    const pending: ExpectedNote[] = []
    for (const n of ev.notes) {
      const k = pool.findIndex((p) => p.pitch === n.pitch)
      if (k < 0) { pending.push(n); continue }
      const [p] = pool.splice(k, 1)
      sounding.push(p)
      const deltaMs = Math.round((p.onset - n.time) * 1000)
      const kind = Math.abs(deltaMs) <= o.timingToleranceMs ? 'ok' : deltaMs < 0 ? 'early' : 'late'
      local.push({ expected: n, verdict: { kind, played: p, deltaMs }, incompleteChord: false })
    }
    for (const n of pending) {
      if (pool.length) {
        pool.sort((a, b) => Math.abs(a.pitch - n.pitch) - Math.abs(b.pitch - n.pitch))
        const p = pool.shift()!
        local.push({ expected: n, verdict: { kind: 'wrong', played: p, semitones: p.pitch - n.pitch, deltaMs: Math.round((p.onset - n.time) * 1000) }, incompleteChord: false })
      } else {
        local.push({ expected: n, verdict: { kind: 'missed' }, incompleteChord: false })
      }
    }
    extras.push(...pool)
    const right = local.filter((r) => r.verdict.kind !== 'wrong' && r.verdict.kind !== 'missed').length
    if (ev.notes.length >= 2 && right > 0 && right < ev.notes.length) local.forEach((r) => (r.incompleteChord = true))
    results.push(...local)
  }

  const realExtras = extras.filter((x) => !isHarmonicOf(x, sounding))
  results.sort((a, b) => a.expected.time - b.expected.time || a.expected.pitch - b.expected.pitch)
  return summarize(results, realExtras)
}

export function notePoints(r: NoteResult): number {
  switch (r.verdict.kind) {
    case 'ok': return 1
    case 'early':
    case 'late': return 0.5
    default: return 0
  }
}

function summarize(notes: NoteResult[], extras: PlayedNote[]): AnalysisResult {
  const points = notes.reduce((s, r) => s + notePoints(r), 0)
  const denom = notes.length + 0.5 * extras.length
  const score = denom ? Math.round((100 * points) / denom) : 0

  const barTotals = new Map<number, { p: number; n: number }>()
  for (const r of notes) {
    const t = barTotals.get(r.expected.bar) ?? { p: 0, n: 0 }
    t.p += notePoints(r)
    t.n += 1
    barTotals.set(r.expected.bar, t)
  }
  const barScores = new Map([...barTotals].map(([b, t]) => [b, t.p / t.n]))
  let weakestBar: number | null = null
  let worst = 1
  for (const [b, s] of [...barScores].sort((a, b) => a[0] - b[0])) {
    if (s < worst) { worst = s; weakestBar = b }
  }
  return { notes, extras, score, mistakes: topMistakes(notes, extras), barScores, weakestBar }
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/** Erreurs regroupées par type, les plus fréquentes d'abord, avec un libellé utile. */
export function topMistakes(notes: NoteResult[], extras: PlayedNote[], limit = 3): Mistake[] {
  const by = (k: MistakeKind) => notes.filter((r) => r.verdict.kind === k)
  const list: Mistake[] = []

  const wrong = by('wrong')
  if (wrong.length) {
    const st = wrong.map((r) => (r.verdict.kind === 'wrong' ? r.verdict.semitones : 0))
    const common = median(st)
    const n = Math.abs(Math.round(common))
    const detail = n % 12 === 0
      ? 'souvent à la mauvaise octave'
      : n > 4
        ? 'souvent loin de la bonne note : vérifie la corde et la case'
        : `en général ${plural(n, 'demi-ton', 'demi-tons')} trop ${common > 0 ? 'haut' : 'bas'}`
    list.push({ kind: 'wrong', count: wrong.length, label: `${plural(wrong.length, 'fausse note', 'fausses notes')} (${detail})` })
  }
  const missed = by('missed')
  if (missed.length) list.push({ kind: 'missed', count: missed.length, label: plural(missed.length, 'note oubliée', 'notes oubliées') })
  if (extras.length) list.push({ kind: 'extra', count: extras.length, label: plural(extras.length, 'note en trop', 'notes en trop') })
  for (const k of ['late', 'early'] as const) {
    const xs = by(k)
    if (!xs.length) continue
    const avg = Math.round(xs.reduce((s, r) => s + Math.abs('deltaMs' in r.verdict ? r.verdict.deltaMs : 0), 0) / xs.length)
    list.push({ kind: k, count: xs.length, label: `${plural(xs.length, k === 'late' ? 'note en retard' : 'note en avance', k === 'late' ? 'notes en retard' : 'notes en avance')} (${avg} ms en moyenne)` })
  }
  const chords = new Set(notes.filter((r) => r.incompleteChord).map((r) => r.expected.time))
  if (chords.size) list.push({ kind: 'incomplete', count: chords.size, label: plural(chords.size, 'accord incomplet', 'accords incomplets') })

  return list.sort((a, b) => b.count - a.count).slice(0, limit)
}
