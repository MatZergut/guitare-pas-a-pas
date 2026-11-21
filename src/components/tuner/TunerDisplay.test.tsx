import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TUNINGS } from '../../lib/music/tunings'
import { computeReading } from '../../lib/tuner/tuner'
import { TunerDisplay } from './TunerDisplay'

const std = TUNINGS.standard
const at = (freq: number, stringIndex?: number) =>
  computeReading(freq, std, 440, stringIndex === undefined ? { kind: 'auto' } : { kind: 'manual', stringIndex })

describe('TunerDisplay', () => {
  it('au repos : invite à jouer', () => {
    render(<TunerDisplay reading={null} tuning={std} idleString={null} allTuned={false} />)
    expect(screen.getByTestId('tuner-instruction')).toHaveTextContent('Joue une corde à vide')
    expect(screen.getByTestId('tuner-display')).toHaveAttribute('data-status', 'idle')
  })

  it('affiche « Mi (E) » et la corde choisie en mode manuel au repos', () => {
    render(<TunerDisplay reading={null} tuning={std} idleString={0} allTuned={false} />)
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('Mi(E)')
    expect(screen.getByText('6e corde')).toBeInTheDocument()
  })

  it('La juste : vert, « Parfait ! »', () => {
    render(<TunerDisplay reading={at(110)} tuning={std} idleString={null} allTuned={false} />)
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('La(A)')
    expect(screen.getByTestId('tuner-note')).toHaveClass('text-ok')
    expect(screen.getByTestId('tuner-cents')).toHaveTextContent('±0 cents')
    expect(screen.getByTestId('tuner-instruction')).toHaveTextContent('Parfait !')
  })

  it('trop bas : consigne « serre », écart négatif', () => {
    render(<TunerDisplay reading={at(110 * 2 ** (-15 / 1200))} tuning={std} idleString={null} allTuned={false} />)
    expect(screen.getByTestId('tuner-cents')).toHaveTextContent('−15 cents')
    expect(screen.getByTestId('tuner-instruction')).toHaveTextContent(/serre/)
    expect(screen.getByTestId('tuner-note')).toHaveClass('text-warn')
  })

  it('montre la note réellement jouée si elle diffère de la corde visée', () => {
    render(<TunerDisplay reading={at(110, 0)} tuning={std} idleString={null} allTuned={false} />)
    expect(screen.getByText('Tu joues : La (A)')).toBeInTheDocument()
    expect(screen.getByTestId('tuner-note')).toHaveClass('text-bad')
  })

  it('félicite quand les 6 cordes sont accordées', () => {
    render(<TunerDisplay reading={null} tuning={std} idleString={null} allTuned />)
    expect(screen.getByTestId('tuner-instruction')).toHaveTextContent('Ta guitare est accordée !')
  })
})
