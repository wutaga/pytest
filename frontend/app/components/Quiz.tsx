'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthProvider'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const QUIZ_STATE_KEY_PREFIX = 'devdrill:quiz:'

interface QuizProps {
  exercise: {
    id: number
    content: {
      question: string
      options: string[]
      correct: string
      explanation: string
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

interface StoredQuizState {
  selected: string | null
  result: SubmitResult | null
  shuffledOptions: string[]
}

function getQuizStorageKey(exerciseId: number): string {
  return `${QUIZ_STATE_KEY_PREFIX}${exerciseId}`
}

function saveQuizState(exerciseId: number, state: StoredQuizState): void {
  window.localStorage.setItem(getQuizStorageKey(exerciseId), JSON.stringify(state))
}

function shuffleOptions(values: string[]): string[] {
  const arr = [...values]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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

export default function Quiz({ exercise, onCompleted }: QuizProps) {
  const { refresh } = useAuth()
  const options = useMemo(
    () => (Array.isArray(exercise.content.options) ? exercise.content.options : []),
    [exercise.content.options],
  )
  const optionsSignature = useMemo(() => options.join('\u0001'), [options])
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [xpToast, setXpToast] = useState<number | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>(options)

  useEffect(() => {
    if (!xpToast) return
    const timeout = setTimeout(() => setXpToast(null), 1400)
    return () => clearTimeout(timeout)
  }, [xpToast])

  useEffect(() => {
    const key = getQuizStorageKey(exercise.id)
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      const nextShuffled = shuffleOptions(options)
      setSelected(null)
      setResult(null)
      setShuffledOptions(nextShuffled)
      saveQuizState(exercise.id, {
        selected: null,
        result: null,
        shuffledOptions: nextShuffled,
      })
      return
    }
    try {
      const parsed = JSON.parse(raw) as StoredQuizState
      setSelected(parsed.selected ?? null)
      setResult(parsed.result ?? null)
      const hasSameOptions =
        Array.isArray(parsed.shuffledOptions) &&
        parsed.shuffledOptions.length === options.length &&
        parsed.shuffledOptions.every((option) =>
          options.includes(option),
        )
      const nextShuffled = hasSameOptions
        ? parsed.shuffledOptions
        : shuffleOptions(options)
      setShuffledOptions(nextShuffled)
      if (!hasSameOptions) {
        saveQuizState(exercise.id, {
          selected: parsed.selected ?? null,
          result: parsed.result ?? null,
          shuffledOptions: nextShuffled,
        })
      }
      if (parsed.result?.correct) onCompleted?.(exercise.id)
    } catch {
      const nextShuffled = shuffleOptions(options)
      setSelected(null)
      setResult(null)
      setShuffledOptions(nextShuffled)
      saveQuizState(exercise.id, {
        selected: null,
        result: null,
        shuffledOptions: nextShuffled,
      })
    }
  }, [exercise.id, optionsSignature])

  const { question } = exercise.content
  const isAnswered = result !== null

  const resetQuizState = () => {
    const nextShuffled = shuffleOptions(options)
    setSelected(null)
    setResult(null)
    setShuffledOptions(nextShuffled)
    saveQuizState(exercise.id, {
      selected: null,
      result: null,
      shuffledOptions: nextShuffled,
    })
  }

  const handleSelect = async (option: string) => {
    if (isAnswered || loading) return
    setSelected(option)
    saveQuizState(exercise.id, { selected: option, result, shuffledOptions })
    setLoading(true)

    try {
      let res = await fetch(
        `${API_BASE}/api/exercises/${exercise.id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answer: option }),
        }
      )

      if (res.status === 401) {
        const refreshed = await tryRefreshSession()
        if (refreshed) {
          res = await fetch(`${API_BASE}/api/exercises/${exercise.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ answer: option }),
          })
        }
      }

      if (res.ok) {
        const data: SubmitResult = await res.json()
        setResult(data)
        saveQuizState(exercise.id, { selected: option, result: data, shuffledOptions })
        if (data.correct) onCompleted?.(exercise.id)
        if (data.xp_earned > 0) {
          setXpToast(data.xp_earned)
          void refresh()
        }
      } else if (res.status === 401) {
        // Не авторизован — проверяем локально без сохранения прогресса
        const correct_answer = exercise.content.correct
        const fallbackResult = {
          correct: option === correct_answer,
          xp_earned: 0,
          explanation: exercise.content.explanation,
          correct_answer,
        }
        setResult(fallbackResult)
        saveQuizState(exercise.id, { selected: option, result: fallbackResult, shuffledOptions })
        if (fallbackResult.correct) onCompleted?.(exercise.id)
      } else {
        // Любая другая ошибка — fallback на локальную проверку
        const correct_answer = exercise.content.correct
        const fallbackResult = {
          correct: option === correct_answer,
          xp_earned: 0,
          explanation: exercise.content.explanation,
          correct_answer,
        }
        setResult(fallbackResult)
        saveQuizState(exercise.id, { selected: option, result: fallbackResult, shuffledOptions })
        if (fallbackResult.correct) onCompleted?.(exercise.id)
      }
    } catch {
      // Нет соединения — fallback на локальную проверку
      const correct_answer = exercise.content.correct
      const fallbackResult = {
        correct: option === correct_answer,
        xp_earned: 0,
        explanation: exercise.content.explanation,
        correct_answer,
      }
      setResult(fallbackResult)
      saveQuizState(exercise.id, { selected: option, result: fallbackResult, shuffledOptions })
      if (fallbackResult.correct) onCompleted?.(exercise.id)
    } finally {
      setLoading(false)
    }
  }

  const getOptionStyle = (option: string) => {
    if (!result) {
      return 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-text)]'
    }
    if (result.correct && option === result.correct_answer) {
      return 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    }
    if (!result.correct && option === selected) {
      return 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
    }
    return 'border-[var(--color-border)] text-[var(--color-text-muted)]'
  }

  return (
    <div className="relative bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      {xpToast ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-[var(--color-success)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-mono text-[var(--color-success)] animate-bounce">
          +{xpToast} XP
        </div>
      ) : null}

      {/* Хедер */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
          Quiz
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--color-brand)]">
            +{exercise.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Вопрос */}
      <div className="mb-4 font-medium leading-relaxed text-[var(--color-text)]">
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
          {question}
        </ReactMarkdown>
      </div>

      {/* Варианты */}
      <div className="flex flex-col gap-2">
        {(shuffledOptions ?? []).map((option) => (
          <button
            key={option}
            disabled={isAnswered || loading}
            onClick={() => handleSelect(option)}
            className={`text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all ${getOptionStyle(option)}`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={resetQuizState}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↺ Сброс
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className={`mt-4 p-4 rounded-lg text-sm ${
          result.correct
            ? 'bg-[var(--color-success-bg)] border border-[var(--color-success)] text-[var(--color-success)]'
            : 'bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)]'
        }`}>
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>{result.correct ? '✅ Верно!' : '❌ Не совсем'}</span>
            {result.xp_earned > 0 && (
              <span className="text-xs font-mono text-[var(--color-brand)] animate-pulse">
                +{result.xp_earned} XP
              </span>
            )}
          </div>
          <div className="text-[var(--color-text-muted)] text-xs leading-relaxed">
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
      )}

    </div>
  )
}
