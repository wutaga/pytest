'use client'

import { useState } from 'react'
import TheoryRenderer from '../components/TheoryRenderer'

const PLACEHOLDER = JSON.stringify([
  { "type": "heading", "text": "Заголовок урока" },
  { "type": "paragraph", "text": "Текст параграфа. Здесь объясняется концепция урока простым языком." },
  { "type": "code", "language": "python", "text": "def test_example():\n    assert 1 + 1 == 2" },
  { "type": "callout", "style": "info", "text": "Важная мысль или подсказка для студента." }
], null, 2)

export default function PreviewPage() {
  const [json, setJson] = useState(PLACEHOLDER)
  const [blocks, setBlocks] = useState(() => JSON.parse(PLACEHOLDER))
  const [error, setError] = useState('')

  const handleRender = () => {
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) {
        setError('Должен быть массив [ ... ]')
        return
      }
      setBlocks(parsed)
      setError('')
    } catch {
      setError('Невалидный JSON — проверь запятые и кавычки')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleRender()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-[var(--color-brand)]">DevDrill</span>
            <span className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-muted)]">
              preview
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)] font-mono hidden md:block">
            Ctrl+Enter — применить
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
                JSON блоки
              </p>
              <button
                onClick={handleRender}
                className="rounded-lg bg-[var(--color-brand)] px-4 py-1.5 font-mono text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Применить
              </button>
            </div>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="h-[calc(100vh-200px)] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 font-mono text-xs leading-relaxed text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
            />
            {error && (
              <p className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-2 font-mono text-xs text-[var(--color-danger)]">
                ⚠️ {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
              Превью
            </p>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <TheoryRenderer blocks={blocks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}