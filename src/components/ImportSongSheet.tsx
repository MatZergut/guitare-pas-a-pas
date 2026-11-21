import { useState } from 'react'
import { LEVEL_LABELS, type Level } from '../content/songs'
import { db } from '../db/db'
import { toImportedSong, type ParsedImport } from '../lib/songs/importSong'
import { Sheet } from './Sheet'

export function ImportSongSheet({ parsed, onClose }: { parsed: ParsedImport | null; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<Level>(2)
  const [prev, setPrev] = useState<ParsedImport | null>(null)
  if (parsed !== prev) {
    setPrev(parsed)
    setTitle(parsed?.title ?? '')
    setLevel(2)
  }
  if (!parsed) return null

  const save = async () => {
    await db.songs.put(toImportedSong(parsed, title, level))
    onClose()
  }

  return (
    <Sheet title="Ajouter un morceau" open onClose={onClose}>
      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-muted">Titre</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-border bg-bg px-3 text-lg" />
      </label>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-muted">Niveau de difficulté</legend>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as Level[]).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} aria-label={LEVEL_LABELS[l]} onClick={() => setLevel(l)}
              className={`min-h-12 rounded-xl border text-lg font-semibold ${level === l ? 'border-accent bg-accent text-bg' : 'border-border'}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{LEVEL_LABELS[level]}</p>
      </fieldset>
      <p className="mb-4 text-xs text-muted">Le fichier reste sur ton téléphone.</p>
      <button type="button" onClick={() => void save()}
        className="min-h-14 w-full rounded-xl bg-accent text-lg font-semibold text-bg">Ajouter à mes morceaux</button>
    </Sheet>
  )
}
