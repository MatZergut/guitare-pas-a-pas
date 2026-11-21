import { barPosition, SCALE_CENTS, type TuneStatus } from '../../lib/tuner/tuner'

const COLOR: Record<TuneStatus | 'far', string> = {
  ok: 'bg-ok', low: 'bg-warn', high: 'bg-warn', far: 'bg-bad',
}

/** Barre horizontale −50…+50 cents, zone verte ±5 au centre. */
export function TunerBar({ cents, status }: { cents: number | null; status: TuneStatus | null }) {
  const active = cents !== null && status !== null
  const far = active && Math.abs(cents) > SCALE_CENTS
  const pos = active ? barPosition(cents) : 0.5
  return (
    <div className="w-full select-none" aria-hidden="true">
      <div className="relative h-14 overflow-hidden rounded-2xl border border-border bg-surface">
        {/* zone juste ±5 c = 10 % de la largeur */}
        <div className="absolute inset-y-0 left-[45%] w-[10%] bg-ok/25" />
        {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((c) => (
          <div key={c} className={`absolute top-0 w-px bg-border ${c === 0 ? 'h-full bg-ok' : c % 20 === 0 ? 'h-1/2' : 'h-1/3'}`}
            style={{ left: `${barPosition(c) * 100}%` }} />
        ))}
        <div
          data-testid="tuner-marker"
          className={`absolute inset-y-0 left-0 w-full transition-[transform,opacity] duration-100 ease-linear ${active ? 'opacity-100' : 'opacity-0'}`}
          style={{ transform: `translateX(${(pos - 0.5) * 100}%)` }}
        >
          <div className={`absolute inset-y-1.5 left-1/2 w-3 -translate-x-1/2 rounded-full shadow ${active ? COLOR[far ? 'far' : status] : ''}`} />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>◀ Trop bas</span>
        <span>Trop haut ▶</span>
      </div>
    </div>
  )
}
