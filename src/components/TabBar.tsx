import { NavLink } from 'react-router'
import type { ReactNode } from 'react'
import { LearnIcon, ProgressIcon, SongsIcon, TuneIcon } from './icons'

export interface Tab { to: string; label: string; icon: ReactNode }

export const TABS: Tab[] = [
  { to: '/accorder', label: 'Accorder', icon: <TuneIcon /> },
  { to: '/apprendre', label: 'Apprendre', icon: <LearnIcon /> },
  { to: '/morceaux', label: 'Morceaux', icon: <SongsIcon /> },
  { to: '/progres', label: 'Progrès', icon: <ProgressIcon /> },
]

export function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-tabbar max-w-xl grid-cols-4">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                `flex h-full min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-medium select-none transition-colors active:bg-border/60 ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {t.icon}
              <span>{t.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
