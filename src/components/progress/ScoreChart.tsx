import { useState } from 'react'

const W = 340
const H = 120
const PAD_X = 12
const TOP = 12
const BOTTOM = 18

/** Courbe des scores (0–100) d'un morceau : ligne 2 px, point final annoté, toucher un point pour sa valeur. */
export function ScoreChart({ scores, title }: { scores: { score: number; playedAt: number }[]; title: string }) {
  const [sel, setSel] = useState<number | null>(null)
  const n = scores.length
  const x = (i: number) => (n === 1 ? W / 2 : PAD_X + (i * (W - 2 * PAD_X - 28)) / (n - 1))
  const y = (s: number) => TOP + (1 - s / 100) * (H - TOP - BOTTOM)
  const pts = scores.map((s, i) => `${x(i)},${y(s.score)}`).join(' ')
  const shown = sel ?? n - 1
  const date = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`${title} : scores successifs ${scores.map((s) => s.score).join(', ')}`}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={y(g)} y2={y(g)} stroke="var(--c-border)" strokeWidth={1} />
            <text x={W} y={y(g) - 3} textAnchor="end" fontSize={10} fill="var(--c-muted)">{g}</text>
          </g>
        ))}
        {n > 1 && <polyline points={pts} fill="none" stroke="var(--c-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {scores.map((s, i) => (
          <g key={s.playedAt} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer">
            <circle cx={x(i)} cy={y(s.score)} r={14} fill="transparent" />
            {(i === shown || n <= 12) && (
              <circle cx={x(i)} cy={y(s.score)} r={i === shown ? 5 : 3} fill="var(--c-accent)" stroke="var(--c-surface)" strokeWidth={2} />
            )}
          </g>
        ))}
        <text x={Math.min(x(shown), W - 40)} y={Math.max(10, y(scores[shown].score) - 10)} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--c-text)">
          {scores[shown].score}
        </text>
        <text x={x(shown)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--c-muted)">{date(scores[shown].playedAt)}</text>
      </svg>
      <table className="sr-only">
        <caption>Scores de {title}</caption>
        <tbody>{scores.map((s) => <tr key={s.playedAt}><th>{date(s.playedAt)}</th><td>{s.score}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
