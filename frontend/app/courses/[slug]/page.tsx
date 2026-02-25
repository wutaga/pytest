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

export default function CoursePage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    fetch(`${API_BASE}/api/courses/${slug}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Не удалось загрузить курс')
        }
        return data as Course
      })
      .then((data) => setCourse(data))
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
              <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                {course.modules.map((module) => {
                  const completedLessons = module.lessons.filter(
                    (lesson) => lesson.lesson_completed,
                  ).length
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
                      <div className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-mono text-white">
                        M{module.order_index + 1}
                      </div>
                      {module.locked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 text-3xl">
                          🔒
                        </div>
                      )}
                      <div className="absolute inset-x-2 bottom-2 rounded-lg border border-black/10 bg-white/88 p-2 backdrop-blur-[1px]">
                        <h2 className="line-clamp-2 text-xs font-semibold text-black md:text-sm">
                          {module.title}
                        </h2>
                        <p className="mt-0.5 text-[10px] text-black/75">
                          Уроков {completedLessons}/{module.lessons.length}
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
