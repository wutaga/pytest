'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'devdrill-access-token'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data?.access_token) {
        throw new Error(data?.detail ?? 'Неверный email или пароль')
      }

      localStorage.setItem(TOKEN_KEY, data.access_token)
      router.push('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-10 text-[var(--color-text)] md:py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          DevDrill
        </p>
        <h1 className="mb-2 text-2xl font-bold">Вход в аккаунт</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Продолжите обучение с того места, где остановились.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 outline-none focus:border-[var(--color-brand)]"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Пароль</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 outline-none focus:border-[var(--color-brand)]"
              placeholder="Ваш пароль"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p className="mt-5 text-sm text-[var(--color-text-muted)]">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-[var(--color-brand)] hover:underline">
            Создать
          </Link>
        </p>
      </div>
    </main>
  )
}

