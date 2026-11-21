import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ImportSongSheet } from '../components/ImportSongSheet'
import { Page } from '../components/Page'
import { BUILTIN_SONGS, LEVEL_LABELS, type Level } from '../content/songs'
import { db } from '../db/db'
import { IMPORT_ACCEPT } from '../lib/songs/format'
import { ImportError, parseImport, type ParsedImport } from '../lib/songs/importSong'

interface Row {
  id: string
  title: string
  detail: string
  level: Level
  imported: boolean
}

export default function SongsPage() {
  const imported = useLiveQuery(() => db.songs.orderBy('importedAt').toArray(), [], [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const rows: Row[] = [
    ...BUILTIN_SONGS.map((s) => ({ id: s.id, title: s.title, detail: `${s.composer} · ${s.style}`, level: s.level, imported: false })),
    ...imported.map((s) => ({ id: s.id, title: s.title, detail: s.artist ?? s.fileName, level: (s.level ?? 2) as Level, imported: true })),
  ]

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      setParsed(await parseImport(file))
    } catch (e) {
      setError(`${e instanceof ImportError ? e.message : 'Erreur inattendue.'} Formats acceptés : Guitar Pro (.gp, .gp3, .gp4, .gp5, .gpx) et MusicXML (.musicxml, .xml).`)
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (row: Row) => {
    if (confirm(`Supprimer « ${row.title} » de tes morceaux ?`)) await db.songs.delete(row.id)
  }

  return (
    <Page title="Morceaux">
      <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}
        className="mb-2 min-h-14 w-full rounded-xl border border-dashed border-accent text-lg font-semibold text-accent disabled:opacity-50">
        {busy ? 'Lecture du fichier…' : '＋ Importer un morceau'}
      </button>
      <input ref={fileInput} type="file" accept={IMPORT_ACCEPT} className="hidden" data-testid="import-input"
        onChange={(e) => void onFile(e.target.files?.[0])} />
      <p className="mb-4 text-xs text-muted">Fichiers Guitar Pro ou MusicXML. Ils restent sur ton téléphone.</p>
      {error && <p role="alert" className="mb-4 rounded-xl border border-bad/50 bg-surface p-3 text-sm">{error}</p>}

      {([1, 2, 3, 4, 5] as Level[]).map((level) => {
        const list = rows.filter((r) => r.level === level)
        if (!list.length) return null
        return (
          <section key={level} className="mb-5" aria-labelledby={`niveau-${level}`}>
            <h2 id={`niveau-${level}`} className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{LEVEL_LABELS[level]}</h2>
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <li key={r.id} className="flex items-stretch gap-2">
                  <Link to={`/morceaux/${encodeURIComponent(r.id)}`}
                    className="flex min-h-16 flex-1 flex-col justify-center rounded-2xl border border-border bg-surface px-4 py-2 active:bg-border/60">
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-sm text-muted">
                      {r.detail}
                      {r.imported && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">Importé</span>}
                    </span>
                  </Link>
                  {r.imported && (
                    <button type="button" aria-label={`Supprimer ${r.title}`} onClick={() => void remove(r)}
                      className="w-12 rounded-2xl border border-border text-muted">🗑</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      <ImportSongSheet parsed={parsed} onClose={() => setParsed(null)} />
    </Page>
  )
}
