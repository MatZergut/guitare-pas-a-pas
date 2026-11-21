import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Écrit un WAV mono 16 bits « type guitare » pour le faux micro de Chrome. */
export function writeGuitarWav(name: string, freq: number, seconds = 4, sampleRate = 48000, { plucked = false } = {}): string {
  const n = Math.floor(seconds * sampleRate)
  const data = Buffer.alloc(n * 2)
  const harmonics = [1, 0.8, 0.5, 0.35, 0.2, 0.1]
  for (let i = 0; i < n; i++) {
    let v = 0
    harmonics.forEach((a, k) => (v += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / sampleRate + k)))
    // Mode « pincé » : note de 1 s qui s'éteint, puis 0,5 s de silence, en boucle.
    const tc = (i / sampleRate) % 1.5
    const env = !plucked ? 1 : tc < 1 ? Math.exp(-2.5 * tc) : 0
    data.writeInt16LE(Math.round((v / harmonics.length) * 0.4 * env * 32767), i * 2)
  }
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  const dir = join(process.cwd(), 'test-results', 'audio')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, name)
  writeFileSync(path, Buffer.concat([h, data]))
  return path
}
