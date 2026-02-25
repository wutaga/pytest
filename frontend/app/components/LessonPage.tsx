'use client'

import { useEffect, useState } from 'react'
import Quiz from './Quiz'
import TheoryRenderer from './TheoryRenderer'
import ThemeToggle from './ThemeToggle'
import CodeRunner from './CodeRunner'

interface QuizContent {
  question: string
  options: string[]
  correct: string
  explanation: string
}

interface CodeRunnerContent {
  task: string
  starter_code: string
}

interface Exercise {
  id: number
  type: string
  content: QuizContent & CodeRunnerContent
  xp_reward: number
}

interface TheoryBlock {
  type: string
  text?: string
  language?: string
  style?: string
}

interface Lesson {
  id: number
  title: string
  theory: TheoryBlock[]
  exercises: Exercise[]
}

export default function LessonPage({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`http://localhost:8000/api/lessons/${lessonId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.detail || 'Не удалось загрузить урок')
        }
        return data
      })
      .then((data) => {
        const normalized: Lesson = {
          id: data.id,
          title: data.title,
          theory: Array.isArray(data.theory) ? data.theory : [],
          exercises: Array.isArray(data.exercises) ? data.exercises : [],
        }
        setLesson(normalized)
        setError(null)
      })
      .catch((err: Error) => {
        setLesson(null)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <div className="text-[var(--color-text-muted)] font-mono">Загрузка урока...</div>
    </div>
  )

  if (!lesson) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <div className="text-[var(--color-danger)] font-mono">{error || 'Урок не найден'}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">

      {/* Хедер */}
      <header className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono text-[var(--color-brand)] font-bold text-lg">DevDrill</span>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-sm text-[var(--color-text-muted)] font-mono">
              Модуль 1 · Основы
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">

        {/* Заголовок урока */}
        <h1 className="text-2xl font-bold mb-8">{lesson.title}</h1>

        {/* Два блока — теория и задание */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Левая часть — теория */}
          <div className="flex-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
            <div className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
              Теория
            </div>
            <TheoryRenderer blocks={lesson.theory} />
          </div>

          {/* Правая часть — задания */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest mb-0">
              Задания
            </div>
            {lesson.exercises.map((exercise) => (
              <div key={exercise.id}>
                {exercise.type === 'quiz' && (
                  <Quiz exercise={exercise} />
                )}
                {exercise.type === 'code_runner' && (
                  <CodeRunner
                    exerciseId={exercise.id}
                    task={exercise.content.task || ''}
                    starterCode={exercise.content.starter_code || ''}
                  />
                )}
              </div>
            ))}
            {lesson.exercises.length === 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
                В этом уроке пока нет заданий.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
