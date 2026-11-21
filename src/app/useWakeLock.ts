import { useEffect } from 'react'

/** Garde l'écran allumé tant que `active` est vrai (Screen Wake Lock API). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let disposed = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const l = await navigator.wakeLock.request('screen')
        if (disposed) void l.release()
        else lock = l
      } catch {
        /* refusé (batterie faible…) : sans gravité */
      }
    }
    const onVis = () => { if (document.visibilityState === 'visible') void acquire() }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [active])
}
