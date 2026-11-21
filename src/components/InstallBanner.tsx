import { useInstallPrompt } from '../app/useInstallPrompt'

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt()
  if (!canInstall) return null
  return (
    <div role="region" aria-label="Installer l'application"
      className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <p className="flex-1 text-sm">Installe l'appli sur ton téléphone pour l'utiliser même sans Internet.</p>
      <button onClick={dismiss} className="min-h-12 px-3 text-sm text-muted">Plus tard</button>
      <button onClick={install} className="min-h-12 rounded-xl bg-accent px-4 text-sm font-semibold text-bg">Installer</button>
    </div>
  )
}
