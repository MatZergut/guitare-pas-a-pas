import { seededRandom } from '../lessons/random'

/**
 * Corde pincée par l'algorithme de Karplus-Strong : un bruit court rejoué en
 * boucle à travers un filtre moyenneur. Timbre proche d'une guitare, calcul
 * léger (~100 000 échantillons pour 2 s, quelques millisecondes).
 *
 * y[n] = g · ½ (y[n−D] + y[n−D−1]) avec D = fs/f − ½ (retard fractionnaire
 * par interpolation linéaire) : la boucle dure exactement une période.
 */
export function pluck(freq: number, sampleRate: number, seconds = 1.8, { decay = 0.996, amp = 0.5, seed = 1 } = {}): Float32Array<ArrayBuffer> {
  const n = Math.floor(seconds * sampleRate)
  const out = new Float32Array(n)
  const D = sampleRate / freq - 0.5
  const start = Math.min(n, Math.ceil(D) + 1)
  const rand = seededRandom(seed)
  for (let i = 0; i < start; i++) out[i] = rand() * 2 - 1
  for (let k = start; k < n; k++) {
    const t = k - D
    const i = Math.floor(t)
    const fr = t - i
    const a = out[i] + (out[i + 1] - out[i]) * fr // y[k−D]
    const b = out[i - 1] + (out[i] - out[i - 1]) * fr // y[k−D−1]
    out[k] = decay * 0.5 * (a + b)
  }
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]))
  const g = peak > 0 ? amp / peak : 0
  const fade = Math.min(n, Math.floor(0.05 * sampleRate))
  for (let i = 0; i < n; i++) out[i] *= g * (i >= n - fade ? (n - i) / fade : 1)
  return out
}
