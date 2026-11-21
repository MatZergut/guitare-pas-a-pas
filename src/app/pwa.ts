import { registerSW } from 'virtual:pwa-register'
import { create } from 'zustand'

interface UpdateState {
  /** Une nouvelle version est téléchargée et attend d'être appliquée. */
  needRefresh: boolean
  apply: () => void
}

export const useAppUpdate = create<UpdateState>(() => ({ needRefresh: false, apply: () => {} }))

/**
 * Enregistre le service worker (appli hors ligne). Une nouvelle version n'est
 * jamais appliquée d'office : l'utilisateur choisit le moment (pas au milieu d'une leçon).
 */
export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return
  const update = registerSW({
    immediate: true,
    onNeedRefresh: () => useAppUpdate.setState({ needRefresh: true }),
  })
  useAppUpdate.setState({ apply: () => void update(true) })
  // Évite que Chrome efface la progression si le stockage manque.
  navigator.storage?.persist?.().catch(() => {})
}
