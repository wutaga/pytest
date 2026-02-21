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
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">

      {/* XP */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Quiz</span>
        <span className="text-xs font-mono text-yellow-500">+{exercise.xp_reward} XP</span>
      </div>

      {/* Вопрос */}
      <p className="text-white font-medium mb-4 leading-relaxed">{question}</p>

      {/* Варианты */}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          let style = 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-white'

          if (isAnswered) {
            if (option === correct) {
              style = 'border-green-500 bg-green-500/10 text-green-400'
            } else if (option === selected) {
              style = 'border-red-500 bg-red-500/10 text-red-400'
            } else {
              style = 'border-gray-800 text-gray-600'
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
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <div className="font-bold mb-1">
            {isCorrect ? '✅ Верно!' : '❌ Не совсем'}
          </div>
          <div className="text-gray-400 text-xs leading-relaxed">{explanation}</div>
        </div>
      )}

    </div>
  )
}