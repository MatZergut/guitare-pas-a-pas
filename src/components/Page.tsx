import type { ReactNode } from 'react'

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="mb-4 mt-2 text-2xl font-bold">{title}</h1>
      {children}
    </section>
  )
}

export function ComingSoon({ phase, children }: { phase: number; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-muted">
      <p>{children}</p>
      <p className="mt-3 text-xs uppercase tracking-wide">Arrive en phase {phase}</p>
    </div>
  )
}
