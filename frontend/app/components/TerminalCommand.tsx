'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const TERMINAL_STATE_KEY_PREFIX = 'devdrill:terminal-command:'

interface TerminalCommandProps {
  exercise: {
    id: number
    content: {
      question: string
      hint: string
      answer: string
      project_tree?: string
      prompt?: string
      placeholder?: string
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

interface StoredTerminalState {
  value: string
  result: SubmitResult | null
}

function getStorageKey(exerciseId: number): string {
  return `${TERMINAL_STATE_KEY_PREFIX}${exerciseId}`
}

function saveState(exerciseId: number, state: StoredTerminalState): void {
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

export default function TerminalCommand({ exercise, onCompleted }: TerminalCommandProps) {
  const { refresh } = useAuth()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [xpToast, setXpToast] = useState<number | null>(null)

  const prompt = exercise.content.prompt?.trim() || '$'
  const placeholder = exercise.content.placeholder?.trim() || 'Введите команду'
  const isAnswered = result !== null

  useEffect(() => {
    const raw = window.localStorage.getItem(getStorageKey(exercise.id))
    if (!raw) {
      setValue('')
      setResult(null)
      return
    }
    try {
      const parsed = JSON.parse(raw) as StoredTerminalState
      setValue(typeof parsed.value === 'string' ? parsed.value : '')
      setResult(parsed.result ?? null)
      if (parsed.result?.correct) onCompleted?.(exercise.id)
    } catch {
      window.localStorage.removeItem(getStorageKey(exercise.id))
      setValue('')
      setResult(null)
    }
  }, [exercise.id, onCompleted])

  useEffect(() => {
    if (!xpToast) return
    const timeout = setTimeout(() => setXpToast(null), 1400)
    return () => clearTimeout(timeout)
  }, [xpToast])

  const handleChange = (nextValue: string) => {
    setValue(nextValue)
    saveState(exercise.id, { value: nextValue, result })
  }

  const handleReset = () => {
    setValue('')
    setResult(null)
    setLoading(false)
    window.localStorage.removeItem(getStorageKey(exercise.id))
  }

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
        saveState(exercise.id, { value, result: data })
        if (data.correct) onCompleted?.(exercise.id)
        if (data.xp_earned > 0) {
          setXpToast(data.xp_earned)
          void refresh()
        }
      } else {
        const fallback: SubmitResult = {
          correct: false,
          xp_earned: 0,
          explanation: exercise.content.hint || 'Команда не зачтена.',
          correct_answer: exercise.content.answer || '',
        }
        setResult(fallback)
        saveState(exercise.id, { value, result: fallback })
      }
    } catch {
      const fallback: SubmitResult = {
        correct: false,
        xp_earned: 0,
        explanation: exercise.content.hint || 'Команда не зачтена.',
        correct_answer: exercise.content.answer || '',
      }
      setResult(fallback)
      saveState(exercise.id, { value, result: fallback })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {xpToast ? (
        <div className="pointer-events-none absolute right-3 top-3 animate-bounce rounded-full border border-[var(--color-success)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-mono text-[var(--color-success)]">
          +{xpToast} XP
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-end">
        <span className="text-xs font-mono text-[var(--color-brand)]">+{exercise.xp_reward} XP</span>
      </div>

      {exercise.content.project_tree ? (
        <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <pre className="whitespace-pre font-mono text-xs leading-6 text-[var(--color-text)]">
            {exercise.content.project_tree}
          </pre>
        </div>
      ) : null}

      <div className="mb-4 leading-relaxed text-[var(--color-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.content.question}</ReactMarkdown>
      </div>

      <div className="rounded-lg border border-[var(--terminal-panel-border)] bg-[var(--terminal-shell-bg)] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[var(--terminal-panel-border)] bg-[var(--terminal-panel-bg)] px-3 py-2">
          <span className="font-mono text-sm text-[var(--terminal-prompt)]">{prompt}</span>
          <input
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isAnswered || loading}
            placeholder={placeholder}
            className="w-full bg-transparent py-1 font-mono text-sm leading-7 tracking-normal text-[var(--terminal-text)] outline-none placeholder:text-[var(--terminal-muted)]"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleSubmit}
          disabled={isAnswered || loading || !value.trim()}
          className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg border border-[var(--color-brand)] bg-[var(--color-brand)] px-4 font-mono text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-muted)]"
        >
          {loading ? '...' : 'Проверить'}
        </button>
        <button
          onClick={handleReset}
          className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-mono text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-brand)]/40 hover:text-[var(--color-text)]"
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
          <div className="mb-1 font-bold">{result.correct ? '✅ Верно!' : '❌ Неверно'}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.explanation}</ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  )
}
