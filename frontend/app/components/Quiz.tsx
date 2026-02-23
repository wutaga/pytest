'use client'

import { useState } from 'react'

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
}

interface SubmitResult {
  correct: boolean
  xp_earned: number
  explanation: string
  correct_answer: string
}

export default function Quiz({ exercise }: QuizProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)

  const { question, options } = exercise.content
  const isAnswered = result !== null

  const handleSelect = async (option: string) => {
    if (isAnswered || loading) return
    setSelected(option)
    setLoading(true)

    try {
      const res = await fetch(
        `http://localhost:8000/api/exercises/${exercise.id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answer: option }),
        }
      )

      if (res.ok) {
        const data: SubmitResult = await res.json()
        setResult(data)
      } else if (res.status === 401) {
        // Не авторизован — проверяем локально без сохранения прогресса
        const correct_answer = exercise.content.correct
        setResult({
          correct: option === correct_answer,
          xp_earned: 0,
          explanation: exercise.content.explanation,
          correct_answer,
        })
      } else {
        // Любая другая ошибка — fallback на локальную проверку
        const correct_answer = exercise.content.correct
        setResult({
          correct: option === correct_answer,
          xp_earned: 0,
          explanation: exercise.content.explanation,
          correct_answer,
        })
      }
    } catch {
      // Нет соединения — fallback на локальную проверку
      const correct_answer = exercise.content.correct
      setResult({
        correct: option === correct_answer,
        xp_earned: 0,
        explanation: exercise.content.explanation,
        correct_answer,
      })
    } finally {
      setLoading(false)
    }
  }

  const getOptionStyle = (option: string) => {
    if (!isAnswered) {
      return 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-text)]'
    }
    if (option === result?.correct_answer) {
      return 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    }
    if (option === selected && !result?.correct) {
      return 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
    }
    return 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60'
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">

      {/* Хедер */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
          Quiz
        </span>
        <span className="text-xs font-mono text-[var(--color-brand)]">
          +{exercise.xp_reward} XP
        </span>
      </div>

      {/* Вопрос */}
      <p className="font-medium mb-4 leading-relaxed">{question}</p>

      {/* Варианты */}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            disabled={isAnswered || loading}
            onClick={() => handleSelect(option)}
            className={`text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all ${getOptionStyle(option)}`}
          >
            {loading && option === selected ? 'Проверка...' : option}
          </button>
        ))}
      </div>

      {/* Результат */}
      {isAnswered && result && (
        <div className={`mt-4 p-4 rounded-lg text-sm ${
          result.correct
            ? 'bg-[var(--color-success-bg)] border border-[var(--color-success)] text-[var(--color-success)]'
            : 'bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)]'
        }`}>
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>{result.correct ? '✅ Верно!' : '❌ Не совсем'}</span>
            {result.xp_earned > 0 && (
              <span className="text-xs font-mono text-[var(--color-brand)]">
                +{result.xp_earned} XP
              </span>
            )}
          </div>
          <div className="text-[var(--color-text-muted)] text-xs leading-relaxed">
            {result.explanation}
          </div>
        </div>
      )}

    </div>
  )
}