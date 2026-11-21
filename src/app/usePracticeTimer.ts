import { useEffect } from 'react'
import { db } from '../db/db'
import { dayKey } from '../lib/progress/stats'

const FLUSH_MS = 15_000

/** Ajoute au temps de pratique du jour le temps passé tant que `active` (et l'appli visible). */
export function usePracticeTimer(active: boolean): void {
  useEffect(() => {
    if (!active) return
    let since = document.hidden ? null : Date.now()
    const flush = () => {
      if (since === null) return
      const seconds = Math.round((Date.now() - since) / 1000)
      since = document.hidden ? null : Date.now()
      if (seconds <= 0) return
      const day = dayKey(new Date())
      void db.transaction('rw', db.practice, async () => {
        const cur = await db.practice.get(day)
        await db.practice.put({ day, seconds: (cur?.seconds ?? 0) + seconds })
      })
    }
    const onVis = () => {
      if (document.hidden) flush()
      else since = Date.now()
    }
    const timer = window.setInterval(flush, FLUSH_MS)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      flush()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active])
}
