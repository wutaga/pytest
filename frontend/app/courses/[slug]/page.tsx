'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import AppHeader from '../../components/AppHeader'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Course = {
  id: number
  title: string
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

export default function CoursePage({ params }: { params: { slug: string } }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/courses/${params.slug}`, { credentials: 'include' })
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
  }, [params.slug])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-10 md:py-16">
        <div className="mx-auto max-w-4xl">
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
            <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h1 className="mb-2 text-3xl font-bold">{course.title}</h1>
              <p className="mb-4 text-[var(--color-text-muted)]">{course.description}</p>
              <div className="mb-6 flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)]">
                <span>Модулей: {course.modules_count}</span>
                <span>Бесплатных модулей: {course.free_modules_count}</span>
                <span>{course.price > 0 ? `${course.price} ₽` : 'Бесплатный курс'}</span>
              </div>
              <div className="mb-6 space-y-3">
                {course.modules.map((module) => (
                  <div
                    key={module.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">{module.title}</h2>
                      <span
                        className={`rounded-md px-2 py-1 text-xs ${
                          module.locked
                            ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
                            : 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                        }`}
                      >
                        {module.locked ? 'Платный модуль' : 'Доступен'}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex items-center gap-2">
                          <span>{module.locked ? '🔒' : '•'}</span>
                          <span>{lesson.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {!course.user_has_paid_access && course.price > 0 && (
                <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text-muted)]">
                  Открыт бесплатный модуль. Для полного доступа оформите подписку или купите курс.
                </div>
              )}
              <Link
                href="/courses"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold"
              >
                Назад в каталог
              </Link>
            </article>
          )}
        </div>
      </main>
    </div>
  )
}
