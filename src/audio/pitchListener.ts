import captureWorkletUrl from './capture.worklet.ts?worker&url'
import { windowSizeFor, type PitchFrame } from '../lib/tuner/detect'
import type { PitchWorkerInit } from './pitch.worker'

export type TimedPitchFrame = PitchFrame & { /** temps audio en ms */ t: number }

/** Pas de traitement par le navigateur : on veut le son brut de la guitare. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  video: false,
}

export class MicError extends Error {
  constructor(public readonly kind: 'denied' | 'no-device' | 'unsupported' | 'other', message: string) {
    super(message)
  }
}

/**
 * Micro → AudioWorklet (capture) → Worker (détection pitchy) → callback.
 * Le thread principal ne reçoit que des résultats ~47 fois par seconde.
 */
export class PitchListener {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private worker: Worker | null = null
  private node: AudioWorkletNode | null = null

  constructor(private readonly onFrame: (f: TimedPitchFrame) => void) {}

  get running(): boolean {
    return this.ctx?.state === 'running'
  }

  /** Démarre la capture. Retourne false si le navigateur attend un geste (toucher) pour lancer l'audio. */
  async start(): Promise<boolean> {
    if (this.ctx) return this.running
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      throw new MicError('unsupported', 'Ce navigateur ne permet pas d’utiliser le micro.')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
    } catch (e) {
      const name = (e as DOMException)?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicError('denied', 'Accès au micro refusé.')
      if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new MicError('no-device', 'Aucun micro trouvé.')
      throw new MicError('other', String(e))
    }

    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    await ctx.audioWorklet.addModule(captureWorkletUrl)

    const windowSize = windowSizeFor(ctx.sampleRate)
    const channel = new MessageChannel()
    this.worker = new Worker(new URL('./pitch.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<TimedPitchFrame>) => this.onFrame(e.data)
    const init: PitchWorkerInit = { type: 'init', port: channel.port2, sampleRate: ctx.sampleRate, windowSize }
    this.worker.postMessage(init, [channel.port2])

    this.node = new AudioWorkletNode(ctx, 'capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      channelCountMode: 'explicit',
      processorOptions: { windowSize, hopSize: windowSize / 4 },
    })
    this.node.port.postMessage({ type: 'port', port: channel.port1 }, [channel.port1])
    ctx.createMediaStreamSource(this.stream).connect(this.node)

    if (ctx.state !== 'running') await ctx.resume().catch(() => {})
    return this.running
  }

  /** À appeler depuis un geste utilisateur si start() a retourné false. */
  async resume(): Promise<boolean> {
    await this.ctx?.resume()
    return this.running
  }

  stop(): void {
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.worker?.terminate()
    void this.ctx?.close().catch(() => {})
    this.node = null
    this.stream = null
    this.worker = null
    this.ctx = null
  }
}
