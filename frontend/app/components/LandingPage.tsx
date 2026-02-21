import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

const features = [
  {
    title: 'Практика вместо видео',
    text: 'Каждый урок состоит из теории и интерактивных заданий в одном экране.',
  },
  {
    title: 'Быстрый фидбек',
    text: 'Сразу видите верный ответ, объяснение и получаете XP за прогресс.',
  },
  {
    title: 'Путь от новичка к уверенному',
    text: 'Курсы разбиты на модули от простого к сложному с четкой структурой.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-mono text-lg font-bold text-[var(--color-brand)]">DevDrill</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Войти
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Интерактивная платформа
            </p>
            <h1 className="mb-4 text-3xl font-bold leading-tight md:text-5xl">
              Прокачивай навыки разработки через практику, а не просмотр видео
            </h1>
            <p className="mb-6 max-w-xl text-[var(--color-text-muted)]">
              Выбирайте курс, проходите задания по шагам и закрепляйте знания на реальных
              сценариях.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/courses"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold text-[var(--color-text)]"
              >
                Смотреть курсы
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Как это работает
            </p>
            <ol className="space-y-4 text-sm text-[var(--color-text-muted)]">
              <li>1. Регистрируетесь и выбираете курс.</li>
              <li>2. Проходите бесплатный первый модуль.</li>
              <li>3. Решаете задания и накапливаете XP.</li>
              <li>4. Открываете следующие модули по подписке или покупке.</li>
            </ol>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3">
          {features.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">{item.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

