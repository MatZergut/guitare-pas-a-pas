import { Navigate, useParams, useSearchParams } from 'react-router'
import { LessonRunner } from '../components/lesson/LessonRunner'
import { LESSONS } from '../content/lessons'

export default function LessonPage() {
  const { lessonId } = useParams()
  const [params] = useSearchParams()
  const i = LESSONS.findIndex((l) => l.id === lessonId)
  if (i < 0) return <Navigate to="/apprendre" replace />
  const seed = params.get('graine')
  return <LessonRunner key={LESSONS[i].id} lesson={LESSONS[i]} next={LESSONS[i + 1]} seed={seed ? Number(seed) : undefined} />
}
