import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

export const TuneIcon = () => (
  <svg {...base}><path d="M12 3v7" /><path d="M9 5H7M9 8H7M15 5h2M15 8h2" /><path d="M12 10c-2 0-3 1.3-3 2.8 0 .8-.6 1.3-1.6 1.5C5 14.9 4 16.6 4 18.3 4 20.6 7.4 22 12 22s8-1.4 8-3.7c0-1.7-1-3.4-3.4-4-1-.2-1.6-.7-1.6-1.5C15 11.3 14 10 12 10z" /><circle cx="12" cy="17" r="1.6" /></svg>
)
export const LearnIcon = () => (
  <svg {...base}><path d="M2 7l10-4 10 4-10 4z" /><path d="M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9" /><path d="M22 7v6" /></svg>
)
export const SongsIcon = () => (
  <svg {...base}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
)
export const ProgressIcon = () => (
  <svg {...base}><path d="M3 21h18" /><path d="M6 17v-5M11 17V8M16 17v-8M21 17V4" /></svg>
)
