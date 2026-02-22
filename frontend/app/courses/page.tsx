'use client'

import Link from 'next/link'
import AppHeader from '../components/AppHeader'
import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Course = {
  id: number
  title: string
  slug: string
  description: string
  price: number
  is_published: boolean
  modules_count: number
  free_modules_count: number
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/courses`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Не удалось загрузить курсы')
        }
        return data as Course[]
      })
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-10 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-bold">Каталог курсов</h1>
          <p className="mb-8 text-[var(--color-text-muted)]">Выберите курс и начните обучение.</p>

          {loading && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
              Загружаем курсы...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-6 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {!loading && !error && courses.length === 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
              Пока нет опубликованных курсов.
            </div>
          )}

          {!loading && !error && courses.length > 0 && (
            <div className="grid gap-4">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold">{course.title}</h2>
                    <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                      {course.price > 0 ? `${course.price} ₽` : 'Бесплатно'}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-[var(--color-text-muted)]">{course.description}</p>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                    <span>Модулей: {course.modules_count}</span>
                    <span>Бесплатных: {course.free_modules_count}</span>
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold"
                  >
                    Открыть курс
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
