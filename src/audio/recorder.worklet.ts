/** AudioWorklet d'enregistrement : regroupe les échantillons du micro par blocs de 4096. */
declare const currentFrame: number
declare class AudioWorkletProcessor { readonly port: MessagePort }
declare function registerProcessor(name: string, ctor: unknown): void

const BLOCK = 4096

class RecorderProcessor extends AudioWorkletProcessor {
  private buf = new Float32Array(BLOCK)
  private n = 0
  private firstFrame = 0
  private recording = true

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data === 'stop') {
        this.flush()
        this.recording = false
        this.port.postMessage({ type: 'stopped' })
      }
    }
  }

  private flush() {
    if (!this.n) return
    const out = this.buf.slice(0, this.n)
    this.port.postMessage({ type: 'chunk', samples: out, firstFrame: this.firstFrame }, [out.buffer])
    this.n = 0
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0]
    if (!ch || !this.recording) return this.recording
    if (this.n === 0) this.firstFrame = currentFrame
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i]
      if (this.n === BLOCK) { this.flush(); this.firstFrame = currentFrame + i + 1 }
    }
    return true
  }
}

registerProcessor('recorder-processor', RecorderProcessor)
export {}
