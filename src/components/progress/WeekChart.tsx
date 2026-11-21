import { useState } from 'react'
import { formatMinutes, type DayBar } from '../../lib/progress/stats'

const W = 340
const H = 150
const TOP = 22
const BOTTOM = 24
const BAR = 24 // largeur max d'une barre

/** Minutes de pratique des 7 derniers jours : une seule série, barres fines, toucher pour la valeur. */
export function WeekChart({ days }: { days: DayBar[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const max = Math.max(10, ...days.map((d) => d.minutes))
  const slot = W / days.length
  const plotH = H - TOP - BOTTOM
  const y = (m: number) => TOP + plotH - (m / max) * plotH
  const peak = days.reduce((b, d, i) => (d.minutes > days[b].minutes ? i : b), 0)
  const labelled = sel ?? (days[peak].minutes > 0 ? peak : null)

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`Pratique des 7 derniers jours : ${days.map((d) => `${d.label} ${d.minutes} min`).join(', ')}`}>
        <line x1={0} x2={W} y1={TOP + plotH} y2={TOP + plotH} stroke="var(--c-border)" strokeWidth={1} />
        {days.map((d, i) => {
          const x = i * slot + (slot - BAR) / 2
          const h = Math.max(0, TOP + plotH - y(d.minutes))
          const r = Math.min(4, h)
          return (
            <g key={d.day} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer" data-testid="week-bar">
              {/* zone de toucher plus large que la barre */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && (
                <path fill="var(--c-accent)" opacity={sel === null || sel === i ? 1 : 0.45}
                  d={`M${x},${TOP + plotH} v${-(h - r)} q0,${-r} ${r},${-r} h${BAR - 2 * r} q${r},0 ${r},${r} v${h - r} z`} />
              )}
              <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={11}
                fill={d.isToday ? 'var(--c-text)' : 'var(--c-muted)'} fontWeight={d.isToday ? 700 : 400}>{d.label}</text>
              {labelled === i && (
                <text x={i * slot + slot / 2} y={y(d.minutes) - 6} textAnchor="middle" fontSize={11} fill="var(--c-text)" fontWeight={600}>
                  {formatMinutes(d.minutes)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <table className="sr-only">
        <caption>Minutes de pratique par jour</caption>
        <tbody>{days.map((d) => <tr key={d.day}><th>{d.label}</th><td>{d.minutes} min</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
