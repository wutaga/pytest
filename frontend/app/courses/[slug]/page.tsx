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
        <div className="mx-auto max-w-6xl">
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
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {course.modules.map((module) => (
                  <Link
                    key={module.id}
                    href={`/courses/${course.slug}/modules/${module.id}`}
                    className={`group rounded-lg border p-3 ${
                      module.locked
                        ? 'border-[var(--color-border)] bg-[var(--color-bg)] opacity-90'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                    }`}
                  >
                    <div
                      className={`relative h-28 w-full rounded-md ${
                        module.locked ? 'bg-[var(--color-border)]' : 'bg-[var(--color-code-bg)]'
                      }`}
                    >
                      {module.locked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/35 text-3xl">
                          🔒
                        </div>
                      )}
                    </div>
                    <h2 className="mt-3 text-base font-semibold md:text-lg">{module.title}</h2>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Уроков: {module.lessons.length}
                    </p>
                  </Link>
                ))}
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
