import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>)

describe('navigation', () => {
  it('ouvre l’accordeur par défaut', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Accorder')
  })

  it('affiche les 4 onglets dans l’ordre', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    const labels = Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)
    expect(labels).toEqual(['Accorder', 'Apprendre', 'Morceaux', 'Progrès'])
  })

  it('change de page et marque l’onglet actif', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'Morceaux' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Morceaux')
    expect(screen.getByRole('link', { name: 'Morceaux' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Accorder' })).not.toHaveAttribute('aria-current')
  })

  it('redirige une URL inconnue vers l’accordeur', () => {
    renderAt('/nimporte-quoi')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Accorder')
  })
})
