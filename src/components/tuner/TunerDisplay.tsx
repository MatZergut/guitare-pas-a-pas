import { midiToNoteName } from '../../lib/music/notes'
import { stringNumber, type Tuning } from '../../lib/music/tunings'
import { instruction, SCALE_CENTS, type TunerReading } from '../../lib/tuner/tuner'
import { TunerBar } from './TunerBar'

interface Props {
  reading: TunerReading | null
  tuning: Tuning
  /** Corde affichée quand il n'y a pas de son (mode manuel). */
  idleString: number | null
  allTuned: boolean
}

/** Affichage central : note visée, écart en cents, consigne, barre. Composant pur. */
export function TunerDisplay({ reading, tuning, idleString, allTuned }: Props) {
  const stringIndex = reading?.stringIndex ?? idleString
  const target = reading?.target ?? (stringIndex !== null ? midiToNoteName(tuning.strings[stringIndex]) : null)
  const far = reading && Math.abs(reading.cents) > SCALE_CENTS
  const tone = !reading ? 'text-muted' : reading.status === 'ok' ? 'text-ok' : far ? 'text-bad' : 'text-warn'
  const showHeard = reading && reading.heard.midi !== reading.target.midi
  const cents = reading ? Math.round(reading.cents) : null

  return (
    <div className="flex flex-col items-center gap-3" data-status={reading?.status ?? 'idle'} data-testid="tuner-display">
      <p className="h-5 text-sm text-muted">{stringIndex !== null ? `${stringNumber(stringIndex)}e corde` : ''}</p>
      <p className={`flex items-baseline gap-2 font-bold leading-none transition-colors ${tone}`} data-testid="tuner-note">
        {target ? (
          <>
            <span className="text-7xl">{target.fr}</span>
            <span className="text-3xl opacity-80">({target.en})</span>
          </>
        ) : (
          <span className="text-7xl">–</span>
        )}
      </p>
      <p className="h-6 text-lg tabular-nums text-muted" data-testid="tuner-cents">
        {cents !== null ? `${cents > 0 ? '+' : cents < 0 ? '−' : '±'}${Math.abs(cents)} cents` : ''}
      </p>
      <div className="w-full"><TunerBar cents={reading?.cents ?? null} status={reading?.status ?? null} /></div>
      <p className={`min-h-7 text-center text-lg font-semibold ${tone}`} aria-live="polite" data-testid="tuner-instruction">
        {reading ? instruction(reading) : allTuned ? 'Ta guitare est accordée !' : 'Joue une corde à vide'}
      </p>
      <p className="h-5 text-sm text-muted">{showHeard ? `Tu joues : ${reading.heard.fr} (${reading.heard.en})` : ''}</p>
    </div>
  )
}
