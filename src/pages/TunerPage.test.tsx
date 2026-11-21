import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import TunerPage from './TunerPage'
import { useSettings } from '../stores/settings'

describe('TunerPage (sans micro)', () => {
  it('explique pourquoi le micro est demandé', async () => {
    render(<TunerPage />)
    expect(await screen.findByRole('button', { name: 'Autoriser le micro' })).toBeInTheDocument()
    expect(screen.getByText(/rien n’est enregistré ni envoyé/)).toBeInTheDocument()
  })

  it('choisir une corde passe en mode manuel', async () => {
    render(<TunerPage />)
    await userEvent.click(screen.getByRole('button', { name: /^5e corde : La \(A\)/ }))
    expect(screen.getByRole('radio', { name: 'Je choisis la corde' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /^5e corde/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('tuner-display')).toBeNull() // l'explication du micro prend la place
  })

  it('change d’accordage depuis les réglages', async () => {
    render(<TunerPage />)
    await userEvent.click(screen.getByRole('button', { name: /Réglages/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Drop D/ }))
    expect(useSettings.getState().tuningId).toBe('dropD')
    await userEvent.click(screen.getByRole('button', { name: 'Monter le diapason' }))
    expect(useSettings.getState().a4Hz).toBe(441)
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getByRole('button', { name: /6e corde : Ré \(D\)/ })).toBeInTheDocument()
  })
})
