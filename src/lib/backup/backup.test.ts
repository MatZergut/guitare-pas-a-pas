import { describe, expect, it } from 'vitest'
import { BackupError, backupFileName, describeBackup, makeBackup, mergeBackup, parseBackup, type BackupData } from './backup'

const empty: BackupData = { lessonProgress: [], performances: [], practice: [], settings: [], songs: [] }
const sample: BackupData = {
  lessonProgress: [{ lessonId: 'a', bestScore: 0.9, attempts: 2, updatedAt: 10, completedAt: 10 }],
  performances: [{ id: 7, songId: 's', score: 80, tempoPercent: 70, topErrors: [], playedAt: 100 }],
  practice: [{ day: '2026-11-20', seconds: 600 }],
  settings: [{ key: 'a4Hz', value: 442 }, { key: 'latencyMs', value: 130 }],
  songs: [{ id: 'import:x', title: 'Mon morceau', fileName: 'x.gp5', format: 'gp5', importedAt: 1, dataBase64: 'AAEC' }],
}

describe('makeBackup / parseBackup', () => {
  it('aller-retour JSON, sans la latence (propre à l’appareil) ni les identifiants internes', () => {
    const b = parseBackup(JSON.stringify(makeBackup(sample, 123)))
    expect(b.exportedAt).toBe(123)
    expect(b.settings.map((s) => s.key)).toEqual(['a4Hz'])
    expect(b.performances[0]).not.toHaveProperty('id')
    expect(b.songs[0].dataBase64).toBe('AAEC')
  })
  it('refuse un fichier étranger, abîmé ou trop récent', () => {
    expect(() => parseBackup('pas du json')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"autre"}')).toThrow('pas une sauvegarde')
    expect(() => parseBackup(JSON.stringify({ ...makeBackup(empty), version: 99 }))).toThrow('plus récente')
    expect(() => parseBackup(JSON.stringify({ ...makeBackup(empty), songs: 'x' }))).toThrow('incomplète')
    expect(() => parseBackup(JSON.stringify({ ...makeBackup(empty), practice: [{ day: 'hier', seconds: 1 }] }))).toThrow('pratique')
  })
})

describe('mergeBackup', () => {
  it('ne perd rien : meilleur score, scores réunis sans doublon, pratique max, morceaux ajoutés', () => {
    const current: BackupData = {
      lessonProgress: [{ lessonId: 'a', bestScore: 0.5, attempts: 5, updatedAt: 20 }, { lessonId: 'b', bestScore: 0.6, attempts: 1, updatedAt: 3 }],
      performances: [{ songId: 's', score: 80, tempoPercent: 70, topErrors: [], playedAt: 100 }, { songId: 's', score: 60, tempoPercent: 70, topErrors: [], playedAt: 50 }],
      practice: [{ day: '2026-11-20', seconds: 900 }, { day: '2026-11-21', seconds: 60 }],
      settings: [{ key: 'a4Hz', value: 440 }],
      songs: [],
    }
    const m = mergeBackup(current, sample)
    expect(m.lessonProgress.find((l) => l.lessonId === 'a')).toMatchObject({ bestScore: 0.9, attempts: 5, completedAt: 10, updatedAt: 20 })
    expect(m.lessonProgress).toHaveLength(2)
    expect(m.performances).toHaveLength(2) // celui à 100 n'est pas dupliqué
    expect(m.practice.find((d) => d.day === '2026-11-20')!.seconds).toBe(900)
    expect(m.practice).toHaveLength(2)
    expect(m.settings).toEqual([{ key: 'a4Hz', value: 440 }]) // réglage présent conservé, latence jamais importée
    expect(m.songs.map((s) => s.id)).toEqual(['import:x'])
  })
})

describe('libellés', () => {
  it('nom de fichier et résumé', () => {
    expect(backupFileName(new Date('2026-03-04T10:00:00'))).toBe('guitare-pas-a-pas-sauvegarde-2026-03-04.json')
    expect(describeBackup(sample)).toBe('1 leçon réussie, 1 score, 1 morceau importé')
  })
})
