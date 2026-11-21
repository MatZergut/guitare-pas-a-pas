/// <reference lib="webworker" />
/**
 * Transcription polyphonique (Basic Pitch, Spotify) dans un Web Worker :
 * rééchantillonnage → modèle TensorFlow.js → notes (hauteur MIDI, début, durée).
 * Tout reste sur l'appareil.
 *
 * Moteur : WebAssembly SIMD par défaut (≈10× plus rapide que le moteur JS pur,
 * fiable sur tous les téléphones) ; repli automatique sur le moteur JS.
 */
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import wasmUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url'
import wasmSimdUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url'
import wasmThreadedUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url'
import { addPitchBendsToNoteEvents, BasicPitch, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch'
import modelUrl from '@spotify/basic-pitch/model/model.json?url'
import weightsUrl from '@spotify/basic-pitch/model/group1-shard1of1.bin?url'
import { MODEL_SAMPLE_RATE, resample } from '../lib/analysis/signal'
import type { PlayedNote } from '../lib/analysis/types'

declare const self: DedicatedWorkerGlobalScope

export type Backend = 'webgl' | 'cpu' | 'wasm'
export type TranscribeRequest = { audio: Float32Array; sampleRate: number; backend?: Backend }
export type TranscribeMessage =
  | { type: 'progress'; stage: 'model' | 'analysis'; pct: number }
  | { type: 'done'; notes: PlayedNote[]; backend: string; ms: number }
  | { type: 'error'; message: string }

let modelPromise: Promise<tf.GraphModel> | null = null

// Basic Pitch appelle tf.fill() sans type : le noyau WebAssembly l'exige. On le complète.
const wasmFill = tf.getKernel('Fill', 'wasm')
if (wasmFill) {
  tf.unregisterKernel('Fill', 'wasm')
  tf.registerKernel({
    ...wasmFill,
    kernelFunc: (args) => wasmFill.kernelFunc({ ...args, attrs: { ...args.attrs, dtype: args.attrs?.dtype ?? 'float32' } }),
  })
}

setWasmPaths({
  'tfjs-backend-wasm.wasm': wasmUrl,
  'tfjs-backend-wasm-simd.wasm': wasmSimdUrl,
  'tfjs-backend-wasm-threaded-simd.wasm': wasmThreadedUrl,
})

async function loadModel(backend: Backend): Promise<tf.GraphModel> {
  try {
    if (!(await tf.setBackend(backend))) throw new Error(`${backend} indisponible`)
  } catch (err) {
    console.warn('[transcription] repli sur le processeur :', String(err))
    await tf.setBackend('cpu')
  }
  await tf.ready()
  const [json, weights] = await Promise.all([fetch(modelUrl).then((r) => r.json()), fetch(weightsUrl).then((r) => r.arrayBuffer())])
  return tf.loadGraphModel(tf.io.fromMemory({
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest[0].weights,
    weightData: weights,
    format: json.format,
    generatedBy: json.generatedBy,
    convertedBy: json.convertedBy,
  }))
}

const post = (m: TranscribeMessage) => self.postMessage(m)

self.onmessage = async (e: MessageEvent<TranscribeRequest>) => {
  const t0 = performance.now()
  try {
    post({ type: 'progress', stage: 'model', pct: 0 })
    modelPromise ??= loadModel(e.data.backend ?? 'wasm')
    await modelPromise // le moteur doit être prêt avant le moindre calcul
    const bp = new BasicPitch(modelPromise)
    const audio = resample(e.data.audio, e.data.sampleRate, MODEL_SAMPLE_RATE)
    const frames: number[][] = []
    const onsets: number[][] = []
    const contours: number[][] = []
    await bp.evaluateModel(audio, (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c) },
      (p) => post({ type: 'progress', stage: 'analysis', pct: p }))
    const events = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.5, 0.3, 5)))
    const notes: PlayedNote[] = events.map((n) => ({ pitch: n.pitchMidi, onset: n.startTimeSeconds, duration: n.durationSeconds, amplitude: n.amplitude }))
    post({ type: 'done', notes, backend: tf.getBackend(), ms: Math.round(performance.now() - t0) })
  } catch (err) {
    post({ type: 'error', message: String(err) })
  }
}
