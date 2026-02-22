import Link from 'next/link'
import AppHeader from '../components/AppHeader'

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-10 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-bold">Каталог курсов</h1>
          <p className="mb-8 text-[var(--color-text-muted)]">
            На следующем шаге сюда подключим данные из API курсов.
          </p>
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="mb-2 text-xl font-semibold">Pytest с нуля</h2>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Первый модуль бесплатный. Дальше — по подписке или покупке курса.
            </p>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold"
            >
              На главную
            </Link>
          </article>
        </div>
      </main>
    </div>
  )
}
