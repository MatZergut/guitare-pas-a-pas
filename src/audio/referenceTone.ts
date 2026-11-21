import { pluck } from '../lib/synth/pluck'
import { midiToFreq } from '../lib/music/notes'

const SECONDS = 1.6
let ctx: AudioContext | null = null
const cache = new Map<string, AudioBuffer>()

/**
 * Joue une note de guitare synthétisée (Karplus-Strong). À appeler depuis un
 * toucher. Retourne la durée en ms, pour ignorer le micro pendant la lecture.
 */
export async function playReference(midi: number, a4Hz = 440): Promise<number> {
  ctx ??= new AudioContext({ latencyHint: 'interactive' })
  if (ctx.state !== 'running') await ctx.resume()
  const key = `${midi}@${a4Hz}@${ctx.sampleRate}`
  let buffer = cache.get(key)
  if (!buffer) {
    const data = pluck(midiToFreq(midi, a4Hz), ctx.sampleRate, SECONDS)
    buffer = ctx.createBuffer(1, data.length, ctx.sampleRate)
    buffer.copyToChannel(data, 0)
    cache.set(key, buffer)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.start()
  return SECONDS * 1000
}
