import { describe, expect, it } from 'vitest'
import { GuitareDB } from './db'

describe('GuitareDB', () => {
  it('enregistre progression, morceaux et historique de scores', async () => {
    const db = new GuitareDB('test-' + Math.random())
    await db.lessonProgress.put({ lessonId: 'cordes-a-vide', bestScore: 0.85, attempts: 2, updatedAt: 1 })
    await db.songs.put({
      id: 'import:abc', title: 'Mon morceau', fileName: 'x.gp5', format: 'gp5',
      data: new Blob(['x']), importedAt: 1,
    })
    await db.performances.bulkAdd([
      { songId: 'builtin:au-clair', score: 60, tempoPercent: 70, topErrors: [], playedAt: 1 },
      { songId: 'builtin:au-clair', score: 80, tempoPercent: 80, topErrors: [], playedAt: 2 },
      { songId: 'autre', score: 10, tempoPercent: 50, topErrors: [], playedAt: 3 },
    ])
    expect((await db.lessonProgress.get('cordes-a-vide'))?.bestScore).toBe(0.85)
    expect(await db.songs.count()).toBe(1)
    const history = await db.performances
      .where('[songId+playedAt]').between(['builtin:au-clair', 0], ['builtin:au-clair', Infinity]).toArray()
    expect(history.map((h) => h.score)).toEqual([60, 80])
    db.close()
  })
})
