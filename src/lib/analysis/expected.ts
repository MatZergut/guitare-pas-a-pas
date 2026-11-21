import type { model } from '@coderline/alphatab'

/** Note attendue avec sa position en ticks et la note alphaTab correspondante (pour la colorer). */
export interface ScoreNote {
  id: number
  pitch: number
  tick: number
  bar: number
  ref: model.Note
}

/**
 * Notes à jouer dans les mesures [fromBar, toBar] d'une piste, dans l'ordre.
 * On ignore les silences, les notes liées (déjà jouées) et les notes étouffées.
 */
export function expectedNotesFromTrack(track: model.Track, fromBar: number, toBar: number): ScoreNote[] {
  const out: ScoreNote[] = []
  const staff = track.staves[0]
  for (let b = fromBar; b <= toBar && b < staff.bars.length; b++) {
    for (const voice of staff.bars[b].voices) {
      for (const beat of voice.beats) {
        if (beat.isRest) continue
        for (const n of beat.notes) {
          if (n.isTieDestination || n.isDead) continue
          out.push({ id: out.length, pitch: n.realValue, tick: beat.absolutePlaybackStart, bar: b, ref: n })
        }
      }
    }
  }
  return out.sort((a, b) => a.tick - b.tick || a.pitch - b.pitch).map((n, i) => ({ ...n, id: i }))
}

/** Convertit des ticks en secondes d'enregistrement : `perfMs = a + b·tick`, puis décalage et latence. */
export function ticksToRecordingTime(tick: number, fit: { a: number; b: number }, recordStartPerfMs: number, latencyMs: number): number {
  return (fit.a + fit.b * tick - recordStartPerfMs + latencyMs) / 1000
}
