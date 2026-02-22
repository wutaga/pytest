'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppHeader from './AppHeader'
import { useAuth } from './AuthProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

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

type ModalType = 'login' | 'register' | null

export default function LandingPage() {
  const { refresh } = useAuth()
  const [modal, setModal] = useState<ModalType>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const closeModal = () => {
    setModal(null)
    setError('')
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Ошибка регистрации')
        return
      }
      // Автологин после регистрации
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      await loginRes.json()
      if (loginRes.ok) {
        await refresh()
        closeModal()
        window.location.href = '/courses'
      }
    } catch {
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Неверный email или пароль')
        return
      }
      await refresh()
      closeModal()
      window.location.href = '/courses'
    } catch {
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">

      {/* Модальное окно */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Хедер модалки */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === 'login' ? 'Вход' : 'Регистрация'}
              </h2>
              <button
                onClick={closeModal}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Форма */}
            {modal === 'register' ? (
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
                />
                <input
                  name="username"
                  type="text"
                  placeholder="Имя пользователя"
                  required
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Пароль"
                  required
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-[var(--color-brand)] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                </button>
                <p className="text-center text-xs text-[var(--color-text-muted)]">
                  Уже есть аккаунт?{' '}
                  <button
                    type="button"
                    onClick={() => { setModal('login'); setError('') }}
                    className="text-[var(--color-brand)] hover:underline"
                  >
                    Войти
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Пароль"
                  required
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-[var(--color-brand)] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Загрузка...' : 'Войти'}
                </button>
                <p className="text-center text-xs text-[var(--color-text-muted)]">
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    onClick={() => { setModal('register'); setError('') }}
                    className="text-[var(--color-brand)] hover:underline"
                  >
                    Зарегистрироваться
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      <AppHeader onLoginClick={() => setModal('login')} />

      {/* Основной контент */}
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
              Выбирайте курс, проходите задания по шагам и закрепляйте знания на реальных сценариях.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setModal('register')}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white"
              >
                Начать бесплатно
              </button>
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
