'use client'

import { useState } from 'react'

interface QuizProps {
  exercise: {
    content: {
      question: string
      options: string[]
      correct: string
      explanation: string
    }
    xp_reward: number
  }
}

export default function Quiz({ exercise }: QuizProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const { question, options, correct, explanation } = exercise.content

  const isCorrect = selected === correct
  const isAnswered = selected !== null

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">

      {/* XP */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Quiz</span>
        <span className="text-xs font-mono text-[var(--color-brand)]">+{exercise.xp_reward} XP</span>
      </div>

      {/* Вопрос */}
      <p className="font-medium mb-4 leading-relaxed">{question}</p>

      {/* Варианты */}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          let style =
            'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-text)]'

          if (isAnswered) {
            if (option === correct) {
              style = 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
            } else if (option === selected) {
              style = 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            } else {
              style = 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60'
            }
          }

          return (
            <button
              key={option}
              disabled={isAnswered}
              onClick={() => setSelected(option)}
              className={`text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all ${style}`}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Результат */}
      {isAnswered && (
        <div className={`mt-4 p-4 rounded-lg text-sm ${
          isCorrect
            ? 'bg-[var(--color-success-bg)] border border-[var(--color-success)] text-[var(--color-success)]'
            : 'bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)]'
        }`}>
          <div className="font-bold mb-1">
            {isCorrect ? '✅ Верно!' : '❌ Не совсем'}
          </div>
          <div className="text-[var(--color-text-muted)] text-xs leading-relaxed">{explanation}</div>
        </div>
      )}

    </div>
  )
}
