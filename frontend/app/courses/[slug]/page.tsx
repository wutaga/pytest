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

