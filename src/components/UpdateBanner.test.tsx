import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useAppUpdate } from '../app/pwa'
import { UpdateBanner } from './UpdateBanner'

describe('UpdateBanner', () => {
  it('invisible tant qu’aucune mise à jour n’attend', () => {
    useAppUpdate.setState({ needRefresh: false })
    const { container } = render(<UpdateBanner />)
    expect(container).toBeEmptyDOMElement()
  })
  it('propose la mise à jour sans l’imposer', async () => {
    const apply = vi.fn()
    useAppUpdate.setState({ needRefresh: true, apply })
    render(<UpdateBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(apply).toHaveBeenCalledOnce()
  })
})
