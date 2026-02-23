'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Quiz from '../../../../../../components/Quiz'
import TheoryRenderer from '../../../../../../components/TheoryRenderer'
import AppHeader from '../../../../../../components/AppHeader'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Exercise {
  id: number
  type: string
  content: {
    question: string
    options: string[]
    correct: string
    explanation: string
  }
  xp_reward: number
}

interface TheoryBlock {
  type: string
  text?: string
  language?: string
  style?: string
}

interface Lesson {
  id: number
  title: string
  theory: TheoryBlock[]
  exercises: Exercise[]
}

interface ModuleData {
  id: number
  title: string
  course: {
    id: number
    slug: string
    title: string
  }
  lessons: Array<{
    id: number
    title: string
    order_index: number
  }>
}

export default function LessonPage() {
  const params = useParams<{ slug: string; moduleId: string; lessonId: string }>()
  const router = useRouter()

  const slug = params?.slug
  const moduleId = params?.moduleId
  const lessonId = params?.lessonId ? parseInt(params.lessonId, 10) : null

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [moduleData, setModuleData] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !moduleId || !lessonId) return

    const fetchLesson = async () => {
      try {
        const [lessonRes, moduleRes] = await Promise.all([
          fetch(`${API_BASE}/api/lessons/${lessonId}`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/courses/${slug}/modules/${moduleId}`, { credentials: 'include' }),
        ])

        const lessonData = await lessonRes.json()
        if (!lessonRes.ok) {
          throw new Error(lessonData?.detail || 'Не удалось загрузить урок')
        }

        const moduleResData = await moduleRes.json()
        if (!moduleRes.ok) {
          throw new Error(moduleResData?.detail || 'Не удалось загрузить модуль')
        }

        const normalizedLesson: Lesson = {
          id: lessonData.id,
          title: lessonData.title,
          theory: Array.isArray(lessonData.theory) ? lessonData.theory : [],
          exercises: Array.isArray(lessonData.exercises) ? lessonData.exercises : [],
        }

        setLesson(normalizedLesson)
        setModuleData(moduleResData as ModuleData)
        setError(null)
      } catch (err) {
        setLesson(null)
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    void fetchLesson()
  }, [slug, moduleId, lessonId])

  // Навигация между уроками
  const currentLessonIndex = moduleData?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  const prevLesson = currentLessonIndex > 0 ? moduleData?.lessons[currentLessonIndex - 1] : null
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < (moduleData?.lessons.length ?? 0) - 1
      ? moduleData?.lessons[currentLessonIndex + 1]
      : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <AppHeader />
        <main className="flex items-center justify-center px-4 py-6">
          <div className="text-[var(--color-text-muted)] font-mono">Загрузка урока...</div>
        </main>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-6 text-sm text-[var(--color-danger)]">
            {error || 'Урок не найден'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-6xl">
          {/* Хлебные крошки */}
          <nav className="mb-4 text-sm text-[var(--color-text-muted)]">
            <Link
              href={`/courses/${moduleData?.course.slug}`}
              className="hover:text-[var(--color-text)]"
            >
              {moduleData?.course.title}
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/courses/${moduleData?.course.slug}/modules/${moduleId}`}
              className="hover:text-[var(--color-text)]"
            >
              {moduleData?.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--color-text)]">{lesson.title}</span>
          </nav>

          {/* Заголовок урока */}
          <h1 className="mb-6 text-2xl font-bold md:text-3xl">{lesson.title}</h1>

          {/* Контент урока */}
          {lesson.exercises.length > 0 ? (
            <div className="flex flex-col gap-8 md:flex-row">
              {/* Левая часть — теория */}
              <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <div className="mb-4 text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                  Теория
                </div>
                <TheoryRenderer blocks={lesson.theory} />
              </div>

              {/* Правая часть — задания */}
              <div className="flex-1 flex flex-col">
                <div className="mb-4 text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                  Задания
                </div>
                <div className="flex flex-col gap-4">
                  {lesson.exercises.map((exercise) =>
                    exercise.type === 'quiz' ? (
                      <Quiz key={exercise.id} exercise={exercise} />
                    ) : (
                      <div
                        key={exercise.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]"
                      >
                        Тип задания «{exercise.type}» будет доступен в следующей версии.
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <TheoryRenderer blocks={lesson.theory} />
            </div>
          )}

          {/* Навигация между уроками */}
          <div className="mt-8 flex items-center gap-4">
            {prevLesson ? (
              <Link
                href={`/courses/${moduleData?.course.slug}/modules/${moduleId}/lessons/${prevLesson.id}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                ← Урок {prevLesson.order_index + 1}
              </Link>
            ) : null}

            <div className="flex-1" />

            {nextLesson ? (
              <Link
                href={`/courses/${moduleData?.course.slug}/modules/${moduleId}/lessons/${nextLesson.id}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                Урок {nextLesson.order_index + 1} →
              </Link>
            ) : (
              <Link
                href={`/courses/${moduleData?.course.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                К курсу →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
