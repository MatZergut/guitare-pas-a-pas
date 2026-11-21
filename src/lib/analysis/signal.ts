/** Taux d'échantillonnage attendu par Basic Pitch. */
export const MODEL_SAMPLE_RATE = 22050

/**
 * Rééchantillonne (descente) par moyenne sur la fenêtre de chaque échantillon
 * de sortie : simple, sans repliement grossier pour une analyse de hauteur.
 */
export function resample(input: Float32Array, fromRate: number, toRate = MODEL_SAMPLE_RATE): Float32Array {
  if (fromRate === toRate) return input.slice()
  const ratio = fromRate / toRate
  const out = new Float32Array(Math.floor((input.length * toRate) / fromRate + 1e-6))
  for (let i = 0; i < out.length; i++) {
    const start = i * ratio
    const end = Math.min(input.length, start + ratio)
    const a = Math.floor(start)
    const b = Math.max(a + 1, Math.ceil(end))
    let s = 0
    for (let k = a; k < b && k < input.length; k++) s += input[k]
    out[i] = s / (b - a)
  }
  return out
}

/** Concatène les morceaux reçus de l'AudioWorklet. */
export function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((s, c) => s + c.length, 0))
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}

/** Droite des moindres carrés y = a + b·x. */
export function linearFit(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length
  if (n === 0) return { a: 0, b: 0 }
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  const b = den ? num / den : 0
  return { a: my - b * mx, b }
}

/**
 * Latence mesurée lors de la calibration : médiane des écarts (ms) entre chaque
 * clic attendu et l'attaque jouée la plus proche (dans ±400 ms).
 * Retourne null s'il n'y a pas assez d'attaques exploitables.
 */
export function estimateLatencyMs(expectedTimes: number[], onsets: number[], minHits = 4): number | null {
  const diffs: number[] = []
  for (const t of expectedTimes) {
    let best: number | null = null
    for (const o of onsets) if (Math.abs(o - t) <= 0.4 && (best === null || Math.abs(o - t) < Math.abs(best - t))) best = o
    if (best !== null) diffs.push((best - t) * 1000)
  }
  if (diffs.length < minHits) return null
  diffs.sort((a, b) => a - b)
  const k = diffs.length >> 1
  return Math.round(diffs.length % 2 ? diffs[k] : (diffs[k - 1] + diffs[k]) / 2)
}
