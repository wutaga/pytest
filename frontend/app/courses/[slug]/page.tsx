'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import AppHeader from '../../components/AppHeader'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Course = {
  title: string
  id: number
  slug: string
  description: string
  price: number
  modules_count: number
  free_modules_count: number
  user_has_paid_access: boolean
  modules: Array<{
    id: number
    title: string
    order_index: number
    is_free: boolean
    locked: boolean
    lessons: Array<{
      id: number
      title: string
      order_index: number
      lesson_completed: boolean
    }>
  }>
}

type CourseProgress = {
  course_id: number
  course_slug: string
  lessons_total: number
  lessons_completed: number
  exercises_total: number
  exercises_completed: number
  modules: Array<{
    module_id: number
    locked: boolean
    lock_reason?: string | null
    lessons_total: number
    lessons_completed: number
    exercises_total: number
    exercises_completed: number
  }>
}

export default function CoursePage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    Promise.all([
      fetch(`${API_BASE}/api/courses/${slug}`, { credentials: 'include' }),
      fetch(`${API_BASE}/api/courses/${slug}/progress`, { credentials: 'include' }),
    ])
      .then(async ([courseRes, progressRes]) => {
        const courseData = await courseRes.json()
        if (!courseRes.ok) {
          throw new Error(courseData?.detail || 'Не удалось загрузить курс')
        }
        const progressData = progressRes.ok ? await progressRes.json() : null
        setCourse(courseData as Course)
        setProgress((progressData ?? null) as CourseProgress | null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="w-full">
          {loading && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
              Загружаем курс...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-6 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {course && !loading && !error && (
            <>
              <h1 className="mb-1 text-2xl font-bold md:text-3xl">{course.title}</h1>
              <p className="mb-6 text-sm text-[var(--color-text-muted)] md:mb-8 md:text-base">
                {course.description}
              </p>
              {progress ? (
                <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs font-mono text-[var(--color-text-muted)]">
                  Прогресс курса: уроки {progress.lessons_completed}/{progress.lessons_total} · задания {progress.exercises_completed}/{progress.exercises_total}
                </div>
              ) : null}
              <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                {course.modules.map((module) => {
                  const moduleProgress = progress?.modules.find(
                    (item) => item.module_id === module.id,
                  )
                  const completedLessons =
                    moduleProgress?.lessons_completed ??
                    module.lessons.filter((lesson) => lesson.lesson_completed).length
                  const lessonsTotal =
                    moduleProgress?.lessons_total ?? module.lessons.length
                  return (
                  <Link
                    key={module.id}
                    href={`/courses/${course.slug}/modules/${module.id}`}
                    className={`group relative block aspect-square w-full overflow-hidden rounded-2xl border p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.14)] ${
                      module.locked
                        ? 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-90'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    }`}
                  >
                    <div
                      className={`relative h-full w-full rounded-xl bg-cover bg-center ${
                        module.locked ? 'bg-[var(--color-border)]' : 'bg-[var(--color-code-bg)]'
                      }`}
                      style={{
                        backgroundImage: `url(/module-covers/${course.slug}/${module.order_index + 1}.jpg)`,
                      }}
                    >
                      {module.locked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 text-3xl">
                          🔒
                        </div>
                      )}
                      <div className="absolute inset-x-3 top-3 rounded-lg bg-black/25 p-2 backdrop-blur-[1px]">
                        <h2 className="line-clamp-2 text-sm font-semibold text-white md:text-base">
                          {module.title}
                        </h2>
                        <p className="mt-1 text-xs text-white/90">
                          Уроков {completedLessons}/{lessonsTotal}
                        </p>
                      </div>
                    </div>
                  </Link>
                  )
                })}
              </div>
              <Link
                href="/courses"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold"
              >
                Назад в каталог
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
