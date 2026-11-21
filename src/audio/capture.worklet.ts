/**
 * AudioWorklet de capture : accumule le signal du micro dans un tampon
 * circulaire et envoie une fenêtre glissante au Worker d'analyse via un
 * MessagePort dédié. Aucun calcul ici : le thread audio doit rester léger.
 */
declare const currentTime: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: unknown)
}
declare function registerProcessor(name: string, ctor: unknown): void

interface Options { processorOptions: { windowSize: number; hopSize: number } }

class CaptureProcessor extends AudioWorkletProcessor {
  private readonly ring: Float32Array
  private readonly windowSize: number
  private readonly hopSize: number
  private write = 0
  private filled = 0
  private sinceLast = 0
  private out: MessagePort | null = null

  constructor(options: Options) {
    super()
    this.windowSize = options.processorOptions.windowSize
    this.hopSize = options.processorOptions.hopSize
    this.ring = new Float32Array(this.windowSize)
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'port') this.out = e.data.port as MessagePort
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0]
    if (!ch) return true
    const n = this.windowSize
    for (let i = 0; i < ch.length; i++) {
      this.ring[this.write] = ch[i]
      this.write = (this.write + 1) % n
    }
    this.filled = Math.min(n, this.filled + ch.length)
    this.sinceLast += ch.length
    if (this.out && this.filled === n && this.sinceLast >= this.hopSize) {
      this.sinceLast = 0
      const buf = new Float32Array(n)
      buf.set(this.ring.subarray(this.write))
      buf.set(this.ring.subarray(0, this.write), n - this.write)
      this.out.postMessage({ buf, t: currentTime * 1000 }, [buf.buffer])
    }
    return true
  }
}

registerProcessor('capture-processor', CaptureProcessor)
