'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GAP_FILL_DRAFT_KEY_PREFIX = 'devdrill:gap-fill:'

interface GapFillProps {
  exercise: {
    id: number
    content: {
      question: string
      answer: string
      hint: string
    }
    xp_reward: number
  }
  onCompleted?: (exerciseId: number) => void
}

interface SubmitResult {
  correct: boolean
  xp_earned: number
  explanation: string
  correct_answer: string
}

interface StoredGapFillState {
  value: string
  result: SubmitResult | null
}

function getStorageKey(exerciseId: number): string {
  return `${GAP_FILL_DRAFT_KEY_PREFIX}${exerciseId}`
}

function saveGapFillState(exerciseId: number, state: StoredGapFillState): void {
  window.localStorage.setItem(getStorageKey(exerciseId), JSON.stringify(state))
}

async function tryRefreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return response.ok
  } catch {
    return false
  }
}

export default function GapFill({ exercise, onCompleted }: GapFillProps) {
  const { refresh } = useAuth()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [xpToast, setXpToast] = useState<number | null>(null)

  useEffect(() => {
    const key = getStorageKey(exercise.id)
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      setValue('')
      setResult(null)
      return
    }
    try {
      const parsed = JSON.parse(raw) as StoredGapFillState
      setValue(typeof parsed.value === 'string' ? parsed.value : '')
      setResult(parsed.result ?? null)
      if (parsed.result?.correct) onCompleted?.(exercise.id)
    } catch {
      window.localStorage.removeItem(key)
    }
  }, [exercise.id])

  useEffect(() => {
    if (!xpToast) return
    const timeout = setTimeout(() => setXpToast(null), 1400)
    return () => clearTimeout(timeout)
  }, [xpToast])

  const isAnswered = result !== null

  const handleSubmit = async () => {
    if (isAnswered || loading || !value.trim()) return
    setLoading(true)
    try {
      let res = await fetch(`${API_BASE}/api/exercises/${exercise.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer: value }),
      })

      if (res.status === 401) {
        const refreshed = await tryRefreshSession()
        if (refreshed) {
          res = await fetch(`${API_BASE}/api/exercises/${exercise.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ answer: value }),
          })
        }
      }

      if (res.ok) {
        const data: SubmitResult = await res.json()
        setResult(data)
        saveGapFillState(exercise.id, { value, result: data })
        if (data.correct) onCompleted?.(exercise.id)
        if (data.xp_earned > 0) {
          setXpToast(data.xp_earned)
          void refresh()
        }
      } else {
        const correctAnswer = exercise.content.answer
        const fallbackResult: SubmitResult = {
          correct: value.trim().toLowerCase() === correctAnswer.trim().toLowerCase(),
          xp_earned: 0,
          explanation: exercise.content.hint,
          correct_answer: correctAnswer,
        }
        setResult(fallbackResult)
        saveGapFillState(exercise.id, { value, result: fallbackResult })
        if (fallbackResult.correct) onCompleted?.(exercise.id)
      }
    } catch {
      const correctAnswer = exercise.content.answer
      const fallbackResult: SubmitResult = {
        correct: value.trim().toLowerCase() === correctAnswer.trim().toLowerCase(),
        xp_earned: 0,
        explanation: exercise.content.hint,
        correct_answer: correctAnswer,
      }
      setResult(fallbackResult)
      saveGapFillState(exercise.id, { value, result: fallbackResult })
      if (fallbackResult.correct) onCompleted?.(exercise.id)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (nextValue: string) => {
    setValue(nextValue)
    saveGapFillState(exercise.id, { value: nextValue, result })
  }

  const handleReset = () => {
    setValue('')
    setResult(null)
    setLoading(false)
    window.localStorage.removeItem(getStorageKey(exercise.id))
  }

  return (
    <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {xpToast ? (
        <div className="pointer-events-none absolute right-3 top-3 animate-bounce rounded-full border border-[var(--color-success)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-mono text-[var(--color-success)]">
          +{xpToast} XP
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-end">
        <span className="text-xs font-mono text-[var(--color-brand)]">
          +{exercise.xp_reward} XP
        </span>
      </div>

      <div className="mb-4 leading-relaxed text-[var(--color-text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="text-[var(--color-text)]">{children}</p>,
            code: ({ children }) => (
              <code className="rounded bg-[var(--color-code-bg)] px-1.5 py-0.5 font-mono text-sm text-[var(--color-code-text)]">
                {children}
              </code>
            ),
          }}
        >
          {exercise.content.question}
        </ReactMarkdown>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isAnswered || loading}
          placeholder="Введите название файла"
          className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm leading-6 tracking-normal text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
        />
        <button
          onClick={handleSubmit}
          disabled={isAnswered || loading || !value.trim()}
          className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-lg border border-[var(--color-brand)] bg-[var(--color-brand)] px-4 font-mono text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-muted)]"
        >
          {loading ? '...' : 'Проверить'}
        </button>
        <button
          onClick={handleReset}
          className="inline-flex h-11 min-w-[100px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-mono text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-brand)]/40 hover:text-[var(--color-text)]"
        >
          ↺ Сброс
        </button>
      </div>

      {isAnswered && result ? (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            result.correct
              ? 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
              : 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
          }`}
        >
          <div className="mb-1 font-bold">
            {result.correct ? '✅ Верно!' : '❌ Неверно'}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p>{children}</p>,
                code: ({ children }) => (
                  <code className="rounded bg-[var(--color-code-bg)] px-1 py-0.5 font-mono text-xs text-[var(--color-code-text)]">
                    {children}
                  </code>
                ),
              }}
            >
              {result.explanation}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  )
}
