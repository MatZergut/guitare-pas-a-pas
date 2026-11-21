import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Page } from '../components/Page'
import { ScoreChart } from '../components/progress/ScoreChart'
import { WeekChart } from '../components/progress/WeekChart'
import { LESSONS } from '../content/lessons'
import { BUILTIN_SONGS } from '../content/songs'
import { db } from '../db/db'
import { BackupError, describeBackup, type Backup } from '../lib/backup/backup'
import { exportBackup, readBackupFile, restoreBackup } from '../lib/backup/backupIO'
import { lessonStates } from '../lib/lessons/progress'
import { formatMinutes, lastSevenDays, songProgress, streaks } from '../lib/progress/stats'
import { useSettings } from '../stores/settings'

function Card({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface p-4" aria-label={title} data-testid={testId}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  )
}

export default function ProgressPage() {
  const lessons = useLiveQuery(() => db.lessonProgress.toArray(), [], [])
  const practice = useLiveQuery(() => db.practice.toArray(), [], [])
  const perfs = useLiveQuery(() => db.performances.toArray(), [], [])
  const imported = useLiveQuery(() => db.songs.toArray(), [], [])
  const latencyMs = useSettings((s) => s.latencyMs)
  const [openSong, setOpenSong] = useState<string | null>(null)

  const today = new Date()
  const states = lessonStates(LESSONS, new Map(lessons.map((l) => [l.lessonId, l])))
  const done = states.filter((s) => s === 'done').length
  const next = LESSONS.find((_, i) => states[i] === 'available')
  const streak = streaks(practice, today)
  const week = lastSevenDays(practice, today)
  const weekTotal = week.reduce((s, d) => s + d.minutes, 0)
  const songs = songProgress(perfs)
  const titles = new Map<string, string>([...BUILTIN_SONGS.map((s) => [s.id, s.title] as const), ...imported.map((s) => [s.id, s.title] as const)])
  titles.set('calibration', 'Calibration')

  return (
    <Page title="Progrès">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4" data-testid="streak">
          <p className="text-4xl font-bold tabular-nums">{streak.current}<span className="ml-1 text-2xl" aria-hidden="true">🔥</span></p>
          <p className="text-sm text-muted">{streak.current > 1 ? 'jours d’affilée' : 'jour d’affilée'}</p>
          {streak.best > streak.current && <p className="mt-1 text-xs text-muted">Record : {streak.best} jours</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4" data-testid="week-total">
          <p className="text-4xl font-bold tabular-nums">{formatMinutes(weekTotal)}</p>
          <p className="text-sm text-muted">cette semaine</p>
        </div>
      </div>

      <Card title="Leçons" testId="lessons-card">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-lg font-semibold">{done} / {LESSONS.length} terminées</p>
          <p className="text-sm text-muted tabular-nums">{Math.round((done / LESSONS.length) * 100)} %</p>
        </div>
        <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={LESSONS.length} aria-valuenow={done} aria-label="Leçons terminées">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(done / LESSONS.length) * 100}%` }} />
        </div>
        {next ? (
          <Link to={`/apprendre/${next.id}`} className="flex min-h-12 items-center justify-between rounded-xl bg-accent/10 px-3 font-medium text-accent">
            <span>Prochaine : {next.title}</span><span aria-hidden="true">→</span>
          </Link>
        ) : <p className="text-sm">Tout le parcours est terminé. Bravo !</p>}
      </Card>

      <Card title="Pratique des 7 derniers jours">
        <WeekChart days={week} />
        <p className="mt-1 text-xs text-muted">Leçons, lecture et évaluation des morceaux. Touche une barre pour voir la durée.</p>
      </Card>

      <Card title="Scores par morceau" testId="songs-card">
        {songs.filter((s) => s.songId !== 'calibration').length === 0 ? (
          <p className="text-sm text-muted">Évalue-toi sur un morceau (bouton « 🎤 M'évaluer ») pour suivre tes progrès ici.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.filter((s) => s.songId !== 'calibration').map((s) => {
              const open = openSong === s.songId
              const title = titles.get(s.songId) ?? 'Morceau supprimé'
              return (
                <li key={s.songId} className="rounded-xl bg-bg">
                  <button type="button" aria-expanded={open} onClick={() => setOpenSong(open ? null : s.songId)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{title}</span>
                      <span className="text-xs text-muted">{s.scores.length} essai{s.scores.length > 1 ? 's' : ''} · meilleur {s.best}</span>
                    </span>
                    <span className="text-2xl font-bold tabular-nums">{s.last}</span>
                  </button>
                  {open && (
                    <div className="px-2 pb-3">
                      <ScoreChart scores={s.scores} title={title} />
                      {titles.has(s.songId) && (
                        <Link to={`/morceaux/${encodeURIComponent(s.songId)}`} className="mt-1 flex min-h-12 items-center justify-center rounded-xl border border-border text-sm font-medium">
                          Ouvrir le morceau
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title="Micro de ce téléphone">
        <p className="mb-3 text-sm">
          {latencyMs === null ? 'Pas encore calibré : les analyses de jeu seront moins précises sur le rythme.' : `Latence calibrée : ${latencyMs} ms.`}
        </p>
        <Link to="/calibration" className="flex min-h-12 items-center justify-center rounded-xl border border-border font-medium">
          {latencyMs === null ? 'Calibrer (20 s)' : 'Recalibrer'}
        </Link>
      </Card>

      <BackupCard />
    </Page>
  )
}

function BackupCard() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const doExport = async () => {
    setBusy(true)
    try {
      const name = await exportBackup()
      setMessage({ ok: true, text: `Sauvegarde enregistrée dans tes téléchargements : ${name}` })
    } catch {
      setMessage({ ok: false, text: 'La sauvegarde a échoué.' })
    } finally { setBusy(false) }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setMessage(null)
    try {
      setPending(await readBackupFile(file))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof BackupError ? e.message : 'Ce fichier n’a pas pu être lu.' })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const confirm = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      await rehydrateSettings()
      setMessage({ ok: true, text: 'Progression restaurée.' })
    } catch {
      setMessage({ ok: false, text: 'La restauration a échoué : rien n’a été modifié.' })
    } finally {
      setPending(null)
      setBusy(false)
    }
  }

  return (
    <Card title="Sauvegarde" testId="backup-card">
      <p className="mb-3 text-sm text-muted">Pour garder ta progression en changeant de téléphone : leçons, scores, temps de pratique et morceaux importés.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void doExport()} disabled={busy} className="min-h-12 rounded-xl bg-accent font-semibold text-bg disabled:opacity-50">Sauvegarder</button>
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="min-h-12 rounded-xl border border-border font-semibold disabled:opacity-50">Restaurer</button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" data-testid="restore-input" onChange={(e) => void onFile(e.target.files?.[0])} />
      {pending && (
        <div className="mt-3 rounded-xl border border-accent p-3" role="alertdialog" aria-label="Confirmer la restauration">
          <p className="mb-1 text-sm font-medium">Sauvegarde du {new Date(pending.exportedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="mb-3 text-sm text-muted">{describeBackup(pending)}. Elle sera ajoutée à ta progression actuelle, sans rien effacer.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPending(null)} className="min-h-12 rounded-xl border border-border">Annuler</button>
            <button type="button" onClick={() => void confirm()} className="min-h-12 rounded-xl bg-accent font-semibold text-bg">Restaurer</button>
          </div>
        </div>
      )}
      {message && <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>}
    </Card>
  )
}

async function rehydrateSettings() {
  await useSettings.getState().hydrate()
}
