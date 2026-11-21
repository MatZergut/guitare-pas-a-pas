import { midiToNoteName } from '../../lib/music/notes'
import { TUNING_IDS, TUNINGS } from '../../lib/music/tunings'
import { A4_MAX, A4_MIN, DEFAULT_SETTINGS, useSettings } from '../../stores/settings'
import { Sheet } from '../Sheet'

export function TunerSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tuningId, a4Hz, set } = useSettings()
  return (
    <Sheet title="Réglages de l'accordeur" open={open} onClose={onClose}>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-muted">Accordage</legend>
        <div className="flex flex-col gap-2">
          {TUNING_IDS.map((id) => {
            const t = TUNINGS[id]
            const checked = id === tuningId
            return (
              <label key={id}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 ${checked ? 'border-accent bg-accent/10' : 'border-border'}`}>
                <input type="radio" name="tuning" value={id} checked={checked}
                  onChange={() => void set('tuningId', id)} className="size-5 accent-[var(--c-accent)]" />
                <span className="flex-1 font-medium">{t.label}</span>
                <span className="text-sm text-muted">{t.strings.map((m) => midiToNoteName(m).fr).join(' ')}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 text-sm text-muted" id="a4-label">Diapason (fréquence du La)</p>
        <div className="flex items-center gap-3" role="group" aria-labelledby="a4-label">
          <button type="button" aria-label="Baisser le diapason" disabled={a4Hz <= A4_MIN}
            onClick={() => void set('a4Hz', a4Hz - 1)}
            className="size-12 rounded-xl border border-border text-2xl disabled:opacity-40">−</button>
          <output className="flex-1 text-center text-xl font-semibold tabular-nums" aria-live="polite">{a4Hz} Hz</output>
          <button type="button" aria-label="Monter le diapason" disabled={a4Hz >= A4_MAX}
            onClick={() => void set('a4Hz', a4Hz + 1)}
            className="size-12 rounded-xl border border-border text-2xl disabled:opacity-40">+</button>
        </div>
        {a4Hz !== DEFAULT_SETTINGS.a4Hz && (
          <button type="button" onClick={() => void set('a4Hz', DEFAULT_SETTINGS.a4Hz)}
            className="mt-2 min-h-12 w-full text-sm text-accent">Revenir à 440 Hz (standard)</button>
        )}
      </div>
    </Sheet>
  )
}
