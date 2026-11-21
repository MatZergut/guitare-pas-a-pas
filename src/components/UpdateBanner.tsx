import { useAppUpdate } from '../app/pwa'

export function UpdateBanner() {
  const { needRefresh, apply } = useAppUpdate()
  if (!needRefresh) return null
  return (
    <div role="status" className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-accent bg-surface p-3">
      <p className="flex-1 text-sm">Une nouvelle version de l'appli est prête.</p>
      <button type="button" onClick={apply} className="min-h-12 rounded-xl bg-accent px-4 text-sm font-semibold text-bg">Mettre à jour</button>
    </div>
  )
}
