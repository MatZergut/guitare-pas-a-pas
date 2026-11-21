import raw from './lessons.json'
import type { Lesson, LessonContent } from '../lib/lessons/types'

export const LESSON_CONTENT = raw as LessonContent
export const LESSONS: Lesson[] = LESSON_CONTENT.lessons

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
