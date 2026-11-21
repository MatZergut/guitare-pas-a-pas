import type { SongFormat } from '../../db/db'

/** Extensions acceptées à l'import, et le format correspondant. */
const EXT: Record<string, SongFormat> = {
  gp: 'gp', gp3: 'gp3', gp4: 'gp4', gp5: 'gp5', gpx: 'gpx',
  musicxml: 'musicxml', xml: 'musicxml', mxl: 'musicxml',
  tex: 'alphatex', alphatex: 'alphatex',
}

export const IMPORT_ACCEPT = Object.keys(EXT).map((e) => `.${e}`).join(',')

export function formatFromFileName(name: string): SongFormat | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return EXT[ext] ?? null
}

/** Titre de secours : nom du fichier sans extension, « _ » et « - » en espaces. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Morceau sans titre'
}
