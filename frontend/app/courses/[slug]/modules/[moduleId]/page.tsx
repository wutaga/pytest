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
        <div className="mx-auto max-w-6xl">
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
                    Для доступа к этому модулю нужна подписка или покупка курса.
                  </p>
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {moduleData.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    >
                      <h3 className="text-base font-semibold">{lesson.title}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Переход к урокам подключим следующим шагом.
                      </p>
                    </div>
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
