import catalog from './songs.json'

export type Level = 1 | 2 | 3 | 4 | 5

export interface BuiltinSong {
  id: string
  title: string
  composer: string
  style: string
  level: Level
}

export const BUILTIN_SONGS = catalog.songs as BuiltinSong[]

/** Partitions alphaTex, intégrées au paquet (disponibles hors ligne). */
const TEX = import.meta.glob('./songs/*.tex', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export function builtinTex(id: string): string | undefined {
  return TEX[`./songs/${id}.tex`]
}

export const LEVEL_LABELS: Record<Level, string> = {
  1: 'Niveau 1 · Premiers pas',
  2: 'Niveau 2 · Débutant',
  3: 'Niveau 3 · Facile',
  4: 'Niveau 4 · Intermédiaire',
  5: 'Niveau 5 · Avancé',
}
