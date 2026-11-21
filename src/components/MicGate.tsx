import type { MicStatus } from '../audio/useMicrophone'

const MESSAGES: Partial<Record<MicStatus, { title: string; body: string }>> = {
  denied: {
    title: 'Le micro est bloqué',
    body: 'Pour le réactiver : touche le cadenas à gauche de l’adresse (ou ⋮ → Paramètres du site), puis Micro → Autoriser. Recharge ensuite la page.',
  },
  'no-device': { title: 'Aucun micro trouvé', body: 'Vérifie qu’aucune autre appli n’utilise le micro, puis réessaie.' },
  unsupported: { title: 'Micro non disponible', body: 'Ouvre l’appli dans Chrome, à une adresse en https://.' },
  error: { title: 'Le micro n’a pas pu démarrer', body: 'Ferme les autres applis qui utilisent le micro, puis réessaie.' },
}

/** Affiche l'explication / l'état du micro, ou rien quand tout va bien. */
export function MicGate({ status, onStart, compact = false }: { status: MicStatus; onStart: () => void; compact?: boolean }) {
  if (status === 'listening' || status === 'checking' || status === 'starting') return null

  if (status === 'needs-permission' && compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
        <p className="flex-1 text-sm text-muted">Le micro écoute ta guitare. Rien n’est enregistré ni envoyé.</p>
        <button type="button" onClick={onStart}
          className="min-h-12 shrink-0 rounded-xl bg-accent px-4 font-semibold text-bg">Autoriser le micro</button>
      </div>
    )
  }

  if (status === 'needs-permission') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-lg font-semibold">L’appli a besoin d’écouter ta guitare</h2>
        <p className="mb-4 text-muted">
          Le micro sert à reconnaître les notes que tu joues. Le son est analysé sur ton téléphone :
          rien n’est enregistré ni envoyé sur Internet.
        </p>
        <button type="button" onClick={onStart}
          className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">Autoriser le micro</button>
      </div>
    )
  }

  if (status === 'needs-gesture') {
    return (
      <button type="button" className="min-h-14 w-full rounded-2xl border border-accent bg-accent/10 p-4 text-lg font-semibold text-accent">
        Touche l’écran pour lancer l’écoute
      </button>
    )
  }

  const m = MESSAGES[status]!
  return (
    <div role="alert" className="rounded-2xl border border-bad/50 bg-surface p-5">
      <h2 className="mb-2 text-lg font-semibold">{m.title}</h2>
      <p className="mb-4 text-muted">{m.body}</p>
      {status !== 'unsupported' && (
        <button type="button" onClick={onStart} className="min-h-12 w-full rounded-xl border border-border font-semibold">Réessayer</button>
      )}
    </div>
  )
}
