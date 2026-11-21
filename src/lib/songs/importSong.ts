import type { ImportedSong } from '../../db/db'
import type { Level } from '../../content/songs'
import { formatFromFileName, titleFromFileName } from './format'

export class ImportError extends Error {}

/** Unifie accents (NFC) et espaces spéciaux des métadonnées de fichiers. */
export function cleanText(s: string | undefined | null): string {
  return (s ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim()
}

export interface ParsedImport {
  title: string
  artist?: string
  fileName: string
  format: ImportedSong['format']
  data: Blob
  trackCount: number
}

/** Lit un fichier choisi par l'utilisateur et vérifie qu'alphaTab sait l'ouvrir. */
export async function parseImport(file: File): Promise<ParsedImport> {
  const format = formatFromFileName(file.name)
  if (!format) throw new ImportError('Format non reconnu.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  // alphaTab n'est chargé qu'au moment d'importer (bibliothèque volumineuse).
  const { importer } = await import('@coderline/alphatab')
  let score
  try {
    score = format === 'alphatex'
      ? importer.ScoreLoader.loadAlphaTex(new TextDecoder().decode(bytes))
      : importer.ScoreLoader.loadScoreFromBytes(bytes)
  } catch {
    throw new ImportError('Ce fichier n’a pas pu être lu.')
  }
  if (!score.tracks.length) throw new ImportError('Ce fichier ne contient aucune piste.')
  return {
    title: cleanText(score.title) || titleFromFileName(file.name),
    artist: cleanText(score.artist) || undefined,
    fileName: file.name,
    format,
    data: new Blob([bytes]),
    trackCount: score.tracks.length,
  }
}

export function toImportedSong(p: ParsedImport, title: string, level: Level, now = Date.now()): ImportedSong {
  return {
    id: `import:${crypto.randomUUID()}`,
    title: title.trim() || p.title,
    artist: p.artist,
    fileName: p.fileName,
    format: p.format,
    data: p.data,
    level,
    importedAt: now,
  }
}
