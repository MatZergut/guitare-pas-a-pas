import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { TabBar } from '../components/TabBar'
import { InstallBanner } from '../components/InstallBanner'
import TunerPage from '../pages/TunerPage'
import LearnPage from '../pages/LearnPage'
import SongsPage from '../pages/SongsPage'
import ProgressPage from '../pages/ProgressPage'
import LessonPage from '../pages/LessonPage'

// alphaTab est volumineux : téléchargé seulement à l'ouverture d'un morceau.
const SongPage = lazy(() => import('../pages/SongPage'))

function Layout() {
  return (
    <div className="min-h-full pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1rem)]">
      <InstallBanner />
      <main><Outlet /></main>
      <TabBar />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Leçon en plein écran, sans barre d'onglets */}
      <Route path="apprendre/:lessonId" element={<LessonPage />} />
      <Route path="morceaux/:songId" element={<Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}><SongPage /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/accorder" replace />} />
        <Route path="accorder" element={<TunerPage />} />
        <Route path="apprendre" element={<LearnPage />} />
        <Route path="morceaux" element={<SongsPage />} />
        <Route path="progres" element={<ProgressPage />} />
        <Route path="*" element={<Navigate to="/accorder" replace />} />
      </Route>
    </Routes>
  )
}
