import { useState } from 'react'
import { useMicrophone } from '../audio/useMicrophone'
import { useWakeLock } from '../app/useWakeLock'
import { MicGate } from '../components/MicGate'
import { Page } from '../components/Page'
import { StringSelector } from '../components/tuner/StringSelector'
import { TunerDisplay } from '../components/tuner/TunerDisplay'
import { TunerSettings } from '../components/tuner/TunerSettings'
import { useTuner } from '../components/tuner/useTuner'
import { TUNINGS } from '../lib/music/tunings'
import type { TunerMode } from '../lib/tuner/tuner'
import { useSettings } from '../stores/settings'

export default function TunerPage() {
  const tuningId = useSettings((s) => s.tuningId)
  const a4Hz = useSettings((s) => s.a4Hz)
  const tuning = TUNINGS[tuningId]
  const [mode, setMode] = useState<TunerMode>({ kind: 'auto' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { reading, tuned, onFrame } = useTuner(tuning, a4Hz, mode)
  const mic = useMicrophone(onFrame)
  useWakeLock(mic.status === 'listening')

  // Tant que le micro n'est pas utilisable, l'explication remplace l'affichage.
  const gateBlocking = !['listening', 'checking', 'starting', 'needs-gesture'].includes(mic.status)
  const manualIndex = mode.kind === 'manual' ? mode.stringIndex : null
  const activeString = reading?.stringIndex ?? manualIndex
  const tuningSummary = `${tuning.label}${a4Hz !== 440 ? ` · La ${a4Hz} Hz` : ''}`

  return (
    <Page
      title="Accorder"
      action={
        <button type="button" onClick={() => setSettingsOpen(true)}
          className="min-h-12 rounded-xl border border-border px-3 text-sm" aria-label={`Réglages : ${tuningSummary}`}>
          {tuningSummary} ⚙
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <MicGate status={mic.status} onStart={() => void mic.start()} />

        {!gateBlocking && (
          <TunerDisplay reading={mic.status === 'listening' ? reading : null} tuning={tuning}
            idleString={manualIndex} allTuned={tuned.size === tuning.strings.length} />
        )}

        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 rounded-xl border border-border p-1">
            {(['auto', 'manual'] as const).map((k) => {
              const on = mode.kind === k
              return (
                <button key={k} type="button" role="radio" aria-checked={on}
                  onClick={() => setMode(k === 'auto' ? { kind: 'auto' } : { kind: 'manual', stringIndex: activeString ?? 0 })}
                  className={`min-h-12 rounded-lg font-medium ${on ? 'bg-accent text-bg' : 'text-muted'}`}>
                  {k === 'auto' ? 'Auto' : 'Je choisis la corde'}
                </button>
              )
            })}
          </div>
          <StringSelector tuning={tuning} active={activeString} tuned={tuned}
            onSelect={(i) => setMode({ kind: 'manual', stringIndex: i })} />
        </div>
      </div>
      <TunerSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Page>
  )
}
