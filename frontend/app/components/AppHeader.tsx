'use client'

import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import { useAuth } from './AuthProvider'

type AppHeaderProps = {
  onLoginClick?: () => void
}

export default function AppHeader({ onLoginClick }: AppHeaderProps) {
  const { user, loading, logout } = useAuth()

  return (
    <header className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="font-mono text-lg font-bold text-[var(--color-brand)]">
          DevDrill
        </Link>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
              ...
            </span>
          ) : user ? (
            <>
              <span className="hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] md:inline">
                {user.username}
              </span>
              <button
                onClick={() => void logout()}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Выйти
              </button>
              <Link
                href="/courses"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Курсы
              </Link>
            </>
          ) : (
            <>
              {onLoginClick ? (
                <button
                  onClick={onLoginClick}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Войти
                </button>
              ) : (
                <Link
                  href="/"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Войти
                </Link>
              )}
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
