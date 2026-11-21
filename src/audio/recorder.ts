import recorderWorkletUrl from './recorder.worklet.ts?worker&url'
import { MIC_CONSTRAINTS, MicError } from './pitchListener'
import { concat } from '../lib/analysis/signal'

export interface Recording {
  audio: Float32Array
  sampleRate: number
  /** Instant (horloge performance.now, ms) du premier échantillon. */
  startPerfMs: number
}

/**
 * Enregistre le micro brut (sans traitement du navigateur) dans un AudioWorklet.
 * L'instant de chaque échantillon est rattaché à l'horloge `performance.now()`
 * pour le caler sur la lecture de la partition.
 */
export class Recorder {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private chunks: Float32Array[] = []
  private firstFrame: number | null = null
  private clockOffsets: number[] = []
  private clockTimer = 0

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
    } catch (e) {
      const name = (e as DOMException)?.name
      throw new MicError(name === 'NotAllowedError' ? 'denied' : 'other', String(e))
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    await ctx.audioWorklet.addModule(recorderWorkletUrl)
    if (ctx.state !== 'running') await ctx.resume()
    this.node = new AudioWorkletNode(ctx, 'recorder-processor', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1, channelCountMode: 'explicit' })
    this.node.port.onmessage = (e) => {
      if (e.data.type === 'chunk') {
        if (this.firstFrame === null) this.firstFrame = e.data.firstFrame
        this.chunks.push(e.data.samples)
      }
    }
    ctx.createMediaStreamSource(this.stream).connect(this.node)
    // Correspondance horloge audio ↔ performance.now(), mesurée plusieurs fois (médiane).
    const sample = () => {
      const ts = ctx.getOutputTimestamp()
      if (ts.contextTime && ts.performanceTime) this.clockOffsets.push(ts.performanceTime - ts.contextTime * 1000)
    }
    sample()
    this.clockTimer = window.setInterval(sample, 250)
  }

  async stop(): Promise<Recording> {
    const ctx = this.ctx
    const node = this.node
    if (!ctx || !node) throw new Error('Enregistrement non démarré')
    window.clearInterval(this.clockTimer)
    await new Promise<void>((resolve) => {
      const prev = node.port.onmessage!
      node.port.onmessage = (e) => { prev.call(node.port, e); if (e.data.type === 'stopped') resolve() }
      node.port.postMessage('stop')
      setTimeout(resolve, 500)
    })
    const offsets = [...this.clockOffsets].sort((a, b) => a - b)
    const offset = offsets.length ? offsets[offsets.length >> 1] : performance.now() - ctx.currentTime * 1000
    const rec: Recording = {
      audio: concat(this.chunks),
      sampleRate: ctx.sampleRate,
      startPerfMs: offset + ((this.firstFrame ?? 0) / ctx.sampleRate) * 1000,
    }
    this.dispose()
    return rec
  }

  dispose(): void {
    window.clearInterval(this.clockTimer)
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close().catch(() => {})
    this.ctx = null
    this.node = null
    this.stream = null
  }
}

/** Transcrit un enregistrement dans le Worker Basic Pitch. */
export function transcribe(rec: Recording, onProgress: (stage: 'model' | 'analysis', pct: number) => void) {
  return new Promise<{ notes: import('../lib/analysis/types').PlayedNote[]; backend: string; ms: number }>((resolve, reject) => {
    const worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<import('./transcribe.worker').TranscribeMessage>) => {
      const m = e.data
      if (m.type === 'progress') onProgress(m.stage, m.pct)
      else {
        worker.terminate()
        if (m.type === 'done') resolve(m)
        else reject(new Error(m.message))
      }
    }
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message)) }
    const audio = rec.audio.slice()
    worker.postMessage({ audio, sampleRate: rec.sampleRate }, [audio.buffer])
  })
}
