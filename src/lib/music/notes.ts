/** Conversions fréquence ↔ note. Module pur, sans dépendance au navigateur. */

export const NOTE_NAMES_FR = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'] as const
export const NOTE_NAMES_EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

/** MIDI du La4 (A4). */
export const A4_MIDI = 69

export function midiToFreq(midi: number, a4Hz = 440): number {
  return a4Hz * 2 ** ((midi - A4_MIDI) / 12)
}

/** Numéro MIDI fractionnaire (ex. 69.12 = La4 + 12 cents). */
export function freqToMidi(freq: number, a4Hz = 440): number {
  return A4_MIDI + 12 * Math.log2(freq / a4Hz)
}

/** Écart en cents de `freq` par rapport à `ref` (positif = trop haut). */
export function centsBetween(freq: number, ref: number): number {
  return 1200 * Math.log2(freq / ref)
}

export interface NoteName {
  /** Nom français : « Mi », « Fa♯ »… */
  fr: string
  /** Nom international : « E », « F♯ »… */
  en: string
  /** Octave en notation scientifique (Mi grave = E2). */
  octave: number
  midi: number
}

export function midiToNoteName(midi: number): NoteName {
  const m = Math.round(midi)
  const pc = ((m % 12) + 12) % 12
  return { fr: NOTE_NAMES_FR[pc], en: NOTE_NAMES_EN[pc], octave: Math.floor(m / 12) - 1, midi: m }
}

/** « Mi (E) » — le format choisi pour l'affichage. */
export function formatNote(n: NoteName): string {
  return `${n.fr} (${n.en})`
}
