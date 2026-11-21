/** Signaux de test : son « type guitare » (fondamentale + harmoniques). */
export function guitarLike(
  freq: number,
  sampleRate: number,
  length: number,
  { harmonics = [1, 0.8, 0.5, 0.35, 0.2, 0.1], amp = 0.3, noise = 0, seed = 1 } = {},
): Float32Array {
  const out = new Float32Array(length)
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let i = 0; i < length; i++) {
    let v = 0
    harmonics.forEach((a, k) => (v += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / sampleRate + k)))
    out[i] = amp * (v / harmonics.length) + noise * rand()
  }
  return out
}

export function whiteNoise(length: number, amp = 0.2, seed = 7): Float32Array {
  const out = new Float32Array(length)
  let s = seed
  for (let i = 0; i < length; i++) out[i] = amp * (((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1)
  return out
}
