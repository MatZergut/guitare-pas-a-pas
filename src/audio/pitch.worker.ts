/// <reference lib="webworker" />
import { createDetector } from '../lib/tuner/detect'

export interface PitchWorkerInit { type: 'init'; port: MessagePort; sampleRate: number; windowSize: number }

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (e: MessageEvent<PitchWorkerInit>) => {
  if (e.data.type !== 'init') return
  const { port, sampleRate, windowSize } = e.data
  const detect = createDetector(windowSize)
  port.onmessage = (ev: MessageEvent<{ buf: Float32Array; t: number }>) => {
    const frame = detect(ev.data.buf, sampleRate)
    self.postMessage({ ...frame, t: ev.data.t })
  }
}
