import { db } from '../../db/db'
import { backupFileName, makeBackup, mergeBackup, parseBackup, type BackupData, type SerializedSong } from './backup'

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64ToBlob(b64: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes])
}

async function readAll(): Promise<BackupData> {
  const songs = await db.songs.toArray()
  return {
    lessonProgress: await db.lessonProgress.toArray(),
    performances: await db.performances.toArray(),
    practice: await db.practice.toArray(),
    settings: await db.settings.toArray(),
    songs: await Promise.all(songs.map(async ({ data, ...s }): Promise<SerializedSong> => ({ ...s, dataBase64: await blobToBase64(data) }))),
  }
}

/** Télécharge un fichier JSON contenant toute la progression. */
export async function exportBackup(): Promise<string> {
  const json = JSON.stringify(makeBackup(await readAll()))
  const name = backupFileName(new Date())
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return name
}

/** Lit un fichier de sauvegarde (lève BackupError s'il n'est pas valide). */
export async function readBackupFile(file: File) {
  return parseBackup(await file.text())
}

/** Fusionne la sauvegarde avec les données présentes (rien n'est perdu). */
export async function restoreBackup(incoming: BackupData): Promise<void> {
  const merged = mergeBackup(await readAll(), incoming)
  await db.transaction('rw', [db.lessonProgress, db.performances, db.practice, db.settings, db.songs], async () => {
    await Promise.all([db.lessonProgress.clear(), db.performances.clear(), db.practice.clear(), db.settings.clear(), db.songs.clear()])
    await db.lessonProgress.bulkPut(merged.lessonProgress)
    await db.performances.bulkAdd(merged.performances.map(({ id: _id, ...p }) => p))
    await db.practice.bulkPut(merged.practice)
    await db.settings.bulkPut(merged.settings)
    await db.songs.bulkPut(merged.songs.map(({ dataBase64, ...s }) => ({ ...s, data: base64ToBlob(dataBase64) })))
  })
}
