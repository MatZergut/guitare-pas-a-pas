import { midiToNoteName } from '../lib/music/notes'
import { openStringMidi } from '../lib/lessons/positions'
import type { Position, StringNumber } from '../lib/lessons/types'

export type MarkTone = 'target' | 'ok' | 'bad' | 'info'

export interface Mark {
  position: Position
  tone: MarkTone
  label?: string
}

interface Props {
  /** Nombre de cases affichées (5 ou 12). */
  frets: number
  marks?: Mark[]
  /** Corde à mettre en évidence (jeu « Trouve la note »). */
  highlightString?: StringNumber
  /** Masque le nom des cordes (quand il donnerait la réponse). */
  hideStringNames?: boolean
  /** Texte décrivant le manche pour les lecteurs d'écran. */
  description?: string
}

const W = 340
const LEFT = 48 // place pour les numéros de case (hors des repères de la 6e corde)
const RIGHT = 22 // la pastille de la 1re corde ne doit pas être coupée
const OPEN_H = 44
const INLAYS = [3, 5, 7, 9]

const FILL: Record<MarkTone, string> = {
  target: 'var(--c-accent)',
  ok: 'var(--c-ok)',
  bad: 'var(--c-bad)',
  info: 'var(--c-surface)',
}

/**
 * Manche vertical, vu comme un diagramme d'accords : 6e corde à gauche,
 * 1re à droite, sillet en haut. Rendu SVG, net à toutes les tailles.
 */
export function Fretboard({ frets, marks = [], highlightString, hideStringNames = false, description }: Props) {
  const rowH = frets <= 5 ? 62 : 38
  const H = OPEN_H + frets * rowH + 30
  const gap = (W - LEFT - RIGHT) / 5
  const sx = (s: StringNumber) => LEFT + (6 - s) * gap
  const fy = (fret: number) => (fret === 0 ? OPEN_H / 2 : OPEN_H + (fret - 0.5) * rowH)
  const midX = LEFT + 2.5 * gap
  const r = frets <= 5 ? 17 : 14

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description ?? 'Manche de guitare'}
      className="mx-auto block h-auto max-h-[48vh] w-full" preserveAspectRatio="xMidYMin meet">
      {/* repères */}
      {INLAYS.filter((f) => f <= frets).map((f) => (
        <circle key={f} cx={midX} cy={fy(f)} r={6} fill="var(--c-border)" />
      ))}
      {frets >= 12 && [1.5, 3.5].map((k) => (
        <circle key={k} cx={LEFT + k * gap} cy={fy(12)} r={6} fill="var(--c-border)" />
      ))}
      {/* frettes */}
      {Array.from({ length: frets + 1 }, (_, f) => (
        <line key={f} x1={LEFT} x2={W - RIGHT} y1={OPEN_H + f * rowH} y2={OPEN_H + f * rowH}
          stroke={f === 0 ? 'var(--c-text)' : 'var(--c-muted)'} strokeWidth={f === 0 ? 6 : 1.5} strokeOpacity={f === 0 ? 0.9 : 0.6} />
      ))}
      {/* numéros de case */}
      {Array.from({ length: frets }, (_, i) => i + 1).map((f) => (
        <text key={f} x={LEFT - 30} y={fy(f) + 4} textAnchor="middle" fontSize={11}
          fill="var(--c-muted)" fontWeight={INLAYS.includes(f) || f === 12 ? 700 : 400}>{f}</text>
      ))}
      {/* cordes : la 6e est la plus épaisse */}
      {([6, 5, 4, 3, 2, 1] as StringNumber[]).map((s) => {
        const hl = s === highlightString
        return (
          <g key={s}>
            <line x1={sx(s)} x2={sx(s)} y1={OPEN_H} y2={OPEN_H + frets * rowH}
              stroke={hl ? 'var(--c-accent)' : 'var(--c-muted)'} strokeWidth={(hl ? 2 : 0) + 0.8 + s * 0.35} />
            {!hideStringNames && (
              <text x={sx(s)} y={H - 8} textAnchor="middle" fontSize={12} data-testid="string-name"
                fill={hl ? 'var(--c-accent)' : 'var(--c-muted)'} fontWeight={hl ? 700 : 400}>
                {midiToNoteName(openStringMidi(s)).fr}
              </text>
            )}
          </g>
        )
      })}
      {/* notes */}
      {marks.map((m, i) => {
        const cx = sx(m.position.string)
        const cy = fy(m.position.fret)
        return (
          <g key={i} data-tone={m.tone} data-testid="fret-mark" className={m.tone === 'target' ? 'animate-pulse' : undefined}>
            <circle cx={cx} cy={cy} r={r} fill={FILL[m.tone]}
              stroke={m.tone === 'info' ? 'var(--c-accent)' : 'none'} strokeWidth={2} />
            {m.label && (
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={m.label.length > 3 ? 10 : 12} fontWeight={700}
                fill={m.tone === 'info' ? 'var(--c-text)' : 'var(--c-bg)'}>{m.label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
