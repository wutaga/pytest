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
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-1 text-2xl font-bold md:text-3xl">Каталог курсов</h1>
          <p className="mb-6 text-sm text-[var(--color-text-muted)] md:mb-8 md:text-base">
            Выберите курс и начните обучение.
          </p>

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-brand)]"
                >
                  <div
                    className="h-36 w-full rounded-md bg-[var(--color-code-bg)] bg-cover bg-center md:h-40"
                    style={{ backgroundImage: `url(/course-covers/${course.slug}.jpg)` }}
                  >
                    <div className="h-full w-full rounded-md bg-gradient-to-b from-transparent to-black/20 transition-opacity group-hover:opacity-80" />
                  </div>
                  <h2 className="mt-3 text-base font-semibold group-hover:text-[var(--color-brand)] md:text-lg">
                    {course.title}
                  </h2>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
