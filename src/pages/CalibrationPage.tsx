import { useMemo } from 'react'
import { SongPlayer } from '../components/player/SongPlayer'
import type { SongSource } from '../components/player/useAlphaTab'

/** 16 noires sur la corde de La à vide, à 80 bpm : on mesure le délai métronome → micro. */
export const CALIBRATION_TEX = `\\title "Calibration"
\\tempo 80
.
\\track "Guitare"
\\staff {tabs}
\\ts 4 4
${Array(4).fill('0.5.4 0.5.4 0.5.4 0.5.4').join(' | ')}`

export default function CalibrationPage() {
  const source = useMemo<SongSource>(() => ({ kind: 'tex', tex: CALIBRATION_TEX }), [])
  return <SongPlayer calibration songId="calibration" title="Calibration du micro" subtitle="Une seule fois par téléphone" source={source} />
}
