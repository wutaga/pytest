'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import AppHeader from '../../../../components/AppHeader'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ModulePayload = {
  id: number
  title: string
  order_index: number
  is_free: boolean
  locked: boolean
  lock_reason?: string | null
  course: {
    id: number
    slug: string
    title: string
  }
  lessons: Array<{
    id: number
    title: string
    order_index: number
    lesson_completed: boolean
  }>
}

export default function ModulePage() {
  const params = useParams<{ slug: string; moduleId: string }>()
  const slug = params?.slug
  const moduleId = params?.moduleId

  const [moduleData, setModuleData] = useState<ModulePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !moduleId) return

    fetch(`${API_BASE}/api/courses/${slug}/modules/${moduleId}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Не удалось загрузить модуль')
        }
        return data as ModulePayload
      })
      .then((data) => setModuleData(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug, moduleId])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="w-full">
          {loading && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
              Загружаем модуль...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-6 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {moduleData && !loading && !error && (
            <>
              <h1 className="mb-1 text-2xl font-bold md:text-3xl">{moduleData.title}</h1>
              <p className="mb-6 text-sm text-[var(--color-text-muted)] md:mb-8 md:text-base">
                Курс: {moduleData.course.title}
              </p>

              {moduleData.locked ? (
                <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <div className="mb-2 text-3xl">🔒</div>
                  <h2 className="mb-2 text-xl font-semibold">Модуль закрыт</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Для доступа к этому модулю нужно купить курс.
                  </p>
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                  {moduleData.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/courses/${moduleData.course.slug}/modules/${moduleData.id}/lessons/${lesson.id}`}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-brand)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px] font-mono text-[var(--color-text-muted)]">
                          Урок {lesson.order_index + 1}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono ${
                            lesson.lesson_completed
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                          }`}
                        >
                          {lesson.lesson_completed ? 'Пройден' : 'Не пройден'}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 min-h-[40px] text-sm font-semibold md:text-[15px]">
                        {lesson.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/courses/${moduleData.course.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold"
              >
                Назад к курсу
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
