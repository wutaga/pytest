'use client'

import { useEffect, useState } from 'react'
import Quiz from './Quiz'
import TheoryRenderer from './TheoryRenderer'

interface Exercise {
  id: number
  type: string
  content: {
    question: string
    options: string[]
    correct: string
    explanation: string
  }
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

  useEffect(() => {
    fetch(`http://localhost:8000/api/lessons/${lessonId}`)
      .then(res => res.json())
      .then(data => {
        setLesson(data)
        setLoading(false)
      })
  }, [lessonId])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 font-mono">Загрузка урока...</div>
    </div>
  )

  if (!lesson) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-red-400 font-mono">Урок не найден</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Хедер */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono text-blue-400 font-bold text-lg">DevDrill</span>
          <span className="text-sm text-gray-500 font-mono">Модуль 1 · Основы</span>
        </div>
      </header>

      {/* Основной контент */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Заголовок урока */}
        <h1 className="text-2xl font-bold text-white mb-8">{lesson.title}</h1>

        {/* Два блока — теория и задание */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Левая часть — теория */}
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
              Теория
            </div>
            <TheoryRenderer blocks={lesson.theory} />
          </div>

          {/* Правая часть — задания */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-0">
              Задания
            </div>
            {lesson.exercises.map((exercise) => (
              <div key={exercise.id}>
                {exercise.type === 'quiz' && (
                  <Quiz exercise={exercise} />
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}