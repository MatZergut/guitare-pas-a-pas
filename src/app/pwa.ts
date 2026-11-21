import { registerSW } from 'virtual:pwa-register'

/** Enregistre le service worker (mise à jour automatique, fonctionne hors ligne). */
export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
  // Évite que Chrome efface la progression si le stockage manque.
  navigator.storage?.persist?.().catch(() => {})
}
