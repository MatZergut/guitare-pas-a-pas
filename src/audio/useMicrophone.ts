import { useCallback, useEffect, useRef, useState } from 'react'
import { MicError, PitchListener, type TimedPitchFrame } from './pitchListener'

export type MicStatus =
  | 'checking' // lecture de l'état de la permission
  | 'needs-permission' // on explique avant de demander
  | 'starting'
  | 'needs-gesture' // le navigateur attend un toucher pour lancer l'audio
  | 'listening'
  | 'denied'
  | 'no-device'
  | 'unsupported'
  | 'error'

async function permissionState(): Promise<PermissionState | 'unknown'> {
  try {
    const p = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return p.state
  } catch {
    return 'unknown'
  }
}

/**
 * Cycle de vie du micro pour un écran : démarre tout seul si la permission est
 * déjà accordée, se coupe quand l'appli passe en arrière-plan ou qu'on quitte l'écran.
 */
export function useMicrophone(onFrame: (f: TimedPitchFrame) => void) {
  const [status, setStatus] = useState<MicStatus>('checking')
  const frameRef = useRef(onFrame)
  frameRef.current = onFrame
  const listenerRef = useRef<PitchListener | null>(null)

  const start = useCallback(async () => {
    if (listenerRef.current) return
    const l = new PitchListener((f) => frameRef.current(f))
    listenerRef.current = l
    setStatus('starting')
    try {
      const running = await l.start()
      if (listenerRef.current !== l) return l.stop() // arrêté entre-temps
      setStatus(running ? 'listening' : 'needs-gesture')
    } catch (e) {
      l.stop()
      if (listenerRef.current === l) listenerRef.current = null
      setStatus(e instanceof MicError ? (e.kind === 'other' ? 'error' : e.kind) : 'error')
    }
  }, [])

  const stop = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
  }, [])

  // Démarrage automatique si déjà autorisé.
  useEffect(() => {
    let cancelled = false
    void permissionState().then((s) => {
      if (cancelled) return
      if (s === 'granted') void start()
      else if (s === 'denied') setStatus('denied')
      else setStatus('needs-permission')
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [start, stop])

  // Le navigateur attend un geste : le premier toucher n'importe où suffit.
  useEffect(() => {
    if (status !== 'needs-gesture') return
    const onTap = () => {
      void listenerRef.current?.resume().then((ok) => ok && setStatus('listening'))
    }
    window.addEventListener('pointerdown', onTap)
    return () => window.removeEventListener('pointerdown', onTap)
  }, [status])

  // Coupe le micro en arrière-plan (batterie, vie privée), relance au retour.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (listenerRef.current) {
          stop()
          setStatus('starting')
        }
      } else if (status === 'starting' && !listenerRef.current) {
        void start()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [status, start, stop])

  return { status, start }
}
