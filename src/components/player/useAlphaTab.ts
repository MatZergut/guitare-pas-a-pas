import { AlphaTabApi, LayoutMode, model, NotationElement, PlayerMode, ScrollMode, Settings, StaveProfile, synth } from '@coderline/alphatab'
import { useEffect, useRef, useState } from 'react'
import { pickGuitarTrack } from '../../lib/songs/score'
import { ensureTablature } from '../../lib/songs/tablature'

export type SongSource = { kind: 'tex'; tex: string } | { kind: 'bytes'; data: Uint8Array }

export interface PlayerInfo {
  score: model.Score | null
  tracks: model.Track[]
  trackIndex: number
  /** Banque de sons chargée : lecture possible. */
  ready: boolean
  loadProgress: number
  playing: boolean
  currentBar: number
  error: string | null
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Crée et pilote une instance alphaTab dans `host`, détruite au démontage. */
export function useAlphaTab(host: React.RefObject<HTMLDivElement | null>, scroller: React.RefObject<HTMLDivElement | null>, source: SongSource | null) {
  const apiRef = useRef<AlphaTabApi | null>(null)
  const [info, setInfo] = useState<PlayerInfo>({
    score: null, tracks: [], trackIndex: 0, ready: false, loadProgress: 0, playing: false, currentBar: 0, error: null,
  })

  useEffect(() => {
    if (!host.current || !scroller.current || !source) return
    const base = import.meta.env.BASE_URL
    const settings = new Settings()
    settings.fillFromJson({
      core: { fontDirectory: `${base}font/`, engine: 'svg' },
      display: {
        staveProfile: StaveProfile.Tab,
        layoutMode: LayoutMode.Page,
        scale: 0.95,
        resources: {
          // Couleurs du thème (clair ou sombre) de l'appli.
          mainGlyphColor: css('--c-text'),
          secondaryGlyphColor: css('--c-muted'),
          staffLineColor: css('--c-muted'),
          barSeparatorColor: css('--c-muted'),
          barNumberColor: css('--c-accent'),
          scoreInfoColor: css('--c-text'),
        },
      },
      player: {
        playerMode: PlayerMode.EnabledSynthesizer,
        soundFont: `${base}soundfont/sonivox.sf3`,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableUserInteraction: true,
        scrollMode: ScrollMode.Continuous,
        scrollOffsetY: -24,
      },
    })
    settings.player.scrollElement = scroller.current
    // Le titre est déjà affiché par l'appli : on ne garde que la tablature.
    for (const el of [NotationElement.ScoreTitle, NotationElement.ScoreSubTitle, NotationElement.ScoreArtist,
      NotationElement.ScoreWords, NotationElement.ScoreMusic, NotationElement.ScoreWordsAndMusic,
      NotationElement.ScoreCopyright, NotationElement.GuitarTuning, NotationElement.TrackNames, NotationElement.EffectDynamics])
      settings.notation.elements.set(el, false)

    let api: AlphaTabApi
    try {
      api = new AlphaTabApi(host.current, settings)
    } catch (e) {
      setInfo((s) => ({ ...s, error: String(e) }))
      return
    }
    apiRef.current = api
    api.countInVolume = 1 // décompte activé par défaut pour débuter
    api.metronomeVolume = 0

    api.scoreLoaded.on((score) => {
      // Pistes sans tablature (partitions MusicXML) : on la calcule, sinon rien ne s'afficherait.
      for (const t of score.tracks) for (const st of t.staves) if (!st.isPercussion) ensureTablature(st as never)
      const track = pickGuitarTrack(score)
      setInfo((s) => ({ ...s, score, tracks: score.tracks, trackIndex: track.index, error: null }))
      api.renderTracks([track])
    })
    api.soundFontLoad.on((e) => setInfo((s) => ({ ...s, loadProgress: e.total ? e.loaded / e.total : 0 })))
    api.playerReady.on(() => setInfo((s) => ({ ...s, ready: true, loadProgress: 1 })))
    api.playerStateChanged.on((e) => setInfo((s) => ({ ...s, playing: e.state === synth.PlayerState.Playing })))
    api.playedBeatChanged.on((beat) => {
      const bar = beat.voice.bar.index
      setInfo((s) => (s.currentBar === bar ? s : { ...s, currentBar: bar }))
    })
    api.error.on((e) => setInfo((s) => ({ ...s, error: e.message })))

    if (source.kind === 'tex') api.tex(source.tex)
    else api.load(source.data)

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [host, scroller, source])

  return { api: apiRef, info }
}
