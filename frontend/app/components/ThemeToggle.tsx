'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { mode, setMode } = useTheme()

  const handleClick = () => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="min-h-[40px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-mono text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      aria-label="Переключить тему"
    >
      Theme
    </button>
  )
}
