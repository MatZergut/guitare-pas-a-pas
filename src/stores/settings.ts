import { create } from 'zustand'
import { db } from '../db/db'

export type TuningId = 'standard' | 'dropD' | 'openG'

export interface Settings {
  /** Fréquence de référence du La4, en Hz. */
  a4Hz: number
  tuningId: TuningId
  /** Latence audio aller-retour mesurée sur CET appareil (ms), null = non calibrée. */
  latencyMs: number | null
}

export const DEFAULT_SETTINGS: Settings = { a4Hz: 440, tuningId: 'standard', latencyMs: null }

/** Bornes raisonnables du diapason (baroque 415 → orchestre moderne 446). */
export const A4_MIN = 415
export const A4_MAX = 466

export function clampA4(hz: number): number {
  if (!Number.isFinite(hz)) return DEFAULT_SETTINGS.a4Hz
  return Math.round(Math.min(A4_MAX, Math.max(A4_MIN, hz)))
}

interface SettingsState extends Settings {
  hydrated: boolean
  hydrate: () => Promise<void>
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

export const useSettings = create<SettingsState>((setState) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  async hydrate() {
    const rows = await db.settings.toArray()
    const stored: Partial<Settings> = {}
    for (const { key, value } of rows) {
      if (key in DEFAULT_SETTINGS) (stored as Record<string, unknown>)[key] = value
    }
    setState({ ...stored, hydrated: true })
  },
  async set(key, value) {
    const v = key === 'a4Hz' ? (clampA4(value as number) as Settings[typeof key]) : value
    setState({ [key]: v } as Partial<SettingsState>)
    await db.settings.put({ key, value: v })
  },
}))
