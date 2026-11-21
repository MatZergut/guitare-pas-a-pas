import { midiToNoteName } from '../../lib/music/notes'
import { stringNumber, type Tuning } from '../../lib/music/tunings'

interface Props {
  tuning: Tuning
  active: number | null
  tuned: ReadonlySet<number>
  onSelect: (index: number) => void
}

/** Les 6 cordes, de la 6e (grave) à gauche à la 1re (aiguë) à droite. */
export function StringSelector({ tuning, active, tuned, onSelect }: Props) {
  return (
    <div role="group" aria-label="Cordes" className="grid grid-cols-6 gap-1.5">
      {tuning.strings.map((midi, i) => {
        const n = midiToNoteName(midi)
        const isActive = active === i
        const isTuned = tuned.has(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={isActive}
            aria-label={`${stringNumber(i)}e corde : ${n.fr} (${n.en})${isTuned ? ', accordée' : ''}`}
            className={`relative flex min-h-16 flex-col items-center justify-center rounded-xl border text-center transition-colors ${
              isActive ? 'border-accent bg-accent/15' : 'border-border bg-surface active:bg-border/60'
            }`}
          >
            <span className="absolute left-1.5 top-1 text-[10px] text-muted">{stringNumber(i)}</span>
            {isTuned && <span className="absolute right-1.5 top-0.5 text-xs text-ok" aria-hidden="true">✓</span>}
            <span className={`text-base font-semibold ${isActive ? 'text-accent' : ''}`}>{n.fr}</span>
            <span className="text-xs text-muted">{n.en}{n.octave}</span>
          </button>
        )
      })}
    </div>
  )
}
