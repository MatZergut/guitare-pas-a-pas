import type { TuningId } from '../../stores/settings'

export interface Tuning {
  id: TuningId
  label: string
  /** MIDI des cordes de la 6e (grave) à la 1re (aiguë). */
  strings: readonly number[]
}

export const TUNINGS: Record<TuningId, Tuning> = {
  standard: { id: 'standard', label: 'Standard', strings: [40, 45, 50, 55, 59, 64] }, // E2 A2 D3 G3 B3 E4
  dropD: { id: 'dropD', label: 'Drop D', strings: [38, 45, 50, 55, 59, 64] }, // D2 A2 D3 G3 B3 E4
  openG: { id: 'openG', label: 'Open G', strings: [38, 43, 50, 55, 59, 62] }, // D2 G2 D3 G3 B3 D4
}

export const TUNING_IDS = Object.keys(TUNINGS) as TuningId[]

/** Numéro de corde à la française : index 0 → « 6e corde ». */
export function stringNumber(index: number): number {
  return 6 - index
}
