import type { ReactNode } from 'react'

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-4 mt-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {action}
      </div>
      {children}
    </section>
  )
}

