import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { clampA4, DEFAULT_SETTINGS, useSettings } from './settings'

describe('clampA4', () => {
  it('borne et arrondit le diapason', () => {
    expect(clampA4(440)).toBe(440)
    expect(clampA4(442.4)).toBe(442)
    expect(clampA4(300)).toBe(415)
    expect(clampA4(999)).toBe(466)
    expect(clampA4(Number.NaN)).toBe(440)
  })
})

describe('useSettings', () => {
  beforeEach(async () => {
    await db.settings.clear()
    useSettings.setState({ ...DEFAULT_SETTINGS, hydrated: false })
  })

  it('a 440 Hz et l’accordage standard par défaut', async () => {
    await useSettings.getState().hydrate()
    const s = useSettings.getState()
    expect(s.hydrated).toBe(true)
    expect(s.a4Hz).toBe(440)
    expect(s.tuningId).toBe('standard')
    expect(s.latencyMs).toBeNull()
  })

  it('persiste les réglages dans IndexedDB et les recharge', async () => {
    await useSettings.getState().set('a4Hz', 442)
    await useSettings.getState().set('tuningId', 'dropD')
    useSettings.setState({ ...DEFAULT_SETTINGS, hydrated: false })
    await useSettings.getState().hydrate()
    expect(useSettings.getState().a4Hz).toBe(442)
    expect(useSettings.getState().tuningId).toBe('dropD')
  })

  it('ignore les clés inconnues stockées', async () => {
    await db.settings.put({ key: 'obsolete', value: 1 })
    await useSettings.getState().hydrate()
    expect('obsolete' in useSettings.getState()).toBe(false)
  })
})
