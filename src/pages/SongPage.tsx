import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { SongPlayer } from '../components/player/SongPlayer'
import type { SongSource } from '../components/player/useAlphaTab'
import { BUILTIN_SONGS, builtinTex } from '../content/songs'
import { db } from '../db/db'

/** Page d'un morceau (chargée à la demande : alphaTab n'est téléchargé qu'ici). */
export default function SongPage() {
  const { songId = '' } = useParams()
  const builtin = BUILTIN_SONGS.find((s) => s.id === songId)
  const imported = useLiveQuery(() => (builtin ? undefined : db.songs.get(songId)), [songId, builtin], null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)

  useEffect(() => {
    if (imported) void imported.data.arrayBuffer().then((b) => setBytes(new Uint8Array(b)))
  }, [imported])

  const source = useMemo<SongSource | null>(() => {
    if (builtin) return { kind: 'tex', tex: builtinTex(builtin.id)! }
    return bytes ? { kind: 'bytes', data: bytes } : null
  }, [builtin, bytes])

  if (builtin) return <SongPlayer songId={builtin.id} title={builtin.title} subtitle={`${builtin.composer} · ${builtin.style}`} source={source!} />
  if (imported === undefined) return <Navigate to="/morceaux" replace />
  if (!imported || !source) return <p className="p-6 text-muted">Chargement…</p>
  return <SongPlayer songId={imported.id} title={imported.title} subtitle={imported.artist} source={source} />
}
