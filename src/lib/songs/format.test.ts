import { describe, expect, it } from 'vitest'
import { formatFromFileName, IMPORT_ACCEPT, titleFromFileName } from './format'

describe('import de fichiers', () => {
  it('reconnaît les formats Guitar Pro, MusicXML et alphaTex', () => {
    expect(formatFromFileName('Mon_Morceau.GP5')).toBe('gp5')
    expect(formatFromFileName('a.gpx')).toBe('gpx')
    expect(formatFromFileName('a.gp')).toBe('gp')
    expect(formatFromFileName('a.musicxml')).toBe('musicxml')
    expect(formatFromFileName('a.xml')).toBe('musicxml')
    expect(formatFromFileName('a.pdf')).toBeNull()
    expect(IMPORT_ACCEPT).toContain('.gp5')
  })
  it('tire un titre du nom de fichier', () => {
    expect(titleFromFileName('ma_super-chanson.gp5')).toBe('ma super chanson')
    expect(titleFromFileName('.gp')).toBe('Morceau sans titre')
  })
})

import { cleanText } from './importSong'
describe('cleanText', () => {
  it('normalise accents et espaces', () => {
    expect(cleanText('Mon essai  impor' + 'té ')).toBe('Mon essai importé')
    expect(cleanText(undefined)).toBe('')
  })
})
