import { describe, expect, it } from 'vitest'
import { midiToFreq } from '../music/notes'
import { hintFor, NoteMatcher } from './matcher'

const hz = (midi: number, cents = 0) => midiToFreq(midi) * 2 ** (cents / 1200)

/** Pousse une fréquence toutes les 20 ms pendant `ms` et renvoie les événements. */
function feed(m: NoteMatcher, freq: number | null, from: number, ms: number) {
  const ev = []
  for (let t = from; t < from + ms; t += 20) {
    const e = m.push(freq, t)
    if (e) ev.push(e)
  }
  return ev
}

describe('NoteMatcher', () => {
  it('valide la bonne note tenue 150 ms, à ±30 cents, une seule fois', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    expect(feed(m, hz(45, 25), 0, 120)).toEqual([])
    expect(feed(m, hz(45, 25), 120, 500)).toEqual([{ type: 'match' }])
  })

  it('signale une autre note tenue 300 ms', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    expect(feed(m, hz(47), 0, 600)).toEqual([{ type: 'wrong', heardMidi: 47 }])
  })

  it('ignore un bref passage sur une autre note (glissé, attaque)', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    expect(feed(m, hz(44), 0, 100)).toEqual([])
    expect(feed(m, hz(45), 100, 300)).toEqual([{ type: 'match' }])
  })

  it('bonne note mais désaccordée de 40 cents : « detuned », pas « wrong »', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    const ev = feed(m, hz(45, -40), 0, 600)
    expect(ev).toHaveLength(1)
    expect(ev[0].type).toBe('detuned')
  })

  it('ignore la note précédente qui résonne encore après un changement de cible', () => {
    const m = new NoteMatcher()
    m.setTarget(40)
    feed(m, hz(40), 0, 300)
    m.setTarget(41)
    expect(feed(m, hz(40), 300, 1000)).toEqual([]) // pas d'erreur pour la note qui résonne
    expect(feed(m, hz(41), 1300, 300)).toEqual([{ type: 'match' }])
  })

  it('ignore le micro pendant que l’appli joue la note de référence', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    m.mute(1000)
    expect(feed(m, hz(45), 0, 1000)).toEqual([])
    expect(feed(m, hz(45), 1000, 300)).toEqual([{ type: 'match' }])
  })

  it('le silence réarme la détection', () => {
    const m = new NoteMatcher()
    m.setTarget(45)
    feed(m, hz(47), 0, 400)
    feed(m, null, 400, 100)
    expect(feed(m, hz(47), 500, 400)).toEqual([{ type: 'wrong', heardMidi: 47 }])
  })
})

describe('hintFor', () => {
  it('indique dans quel sens se déplacer', () => {
    expect(hintFor(43, 45)).toBe('Trop grave de 2 cases : avance vers la caisse de la guitare.')
    expect(hintFor(46, 45)).toBe('Trop aigu de 1 case : recule vers la tête de la guitare.')
    expect(hintFor(33, 45)).toMatch(/octave/)
  })
})
