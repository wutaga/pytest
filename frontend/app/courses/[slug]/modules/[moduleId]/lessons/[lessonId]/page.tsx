'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Quiz from '../../../../../../components/Quiz';
import GapFill from '../../../../../../components/GapFill';
import TerminalCommand from '../../../../../../components/TerminalCommand';
import TheoryRenderer from '../../../../../../components/TheoryRenderer';
import AppHeader from '../../../../../../components/AppHeader';
import CodeRunner from '../../../../../../components/CodeRunner';
import { useAuth } from '../../../../../../components/AuthProvider';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const ACTIVE_EXERCISE_KEY_PREFIX = 'devdrill:lesson:active-exercise:';

interface Exercise {
  id: number;
  type: string;
  locked?: boolean;
  requires_course_purchase?: boolean;
  lock_reason?: string | null;
    content: {
      question: string;
      options: string[];
      correct: string;
      explanation: string;
      answer: string;
      hint: string;
      task: string;
      starter_code: string;
      project_tree?: string;
      prompt?: string;
      placeholder?: string;
    };
  xp_reward: number;
}

interface TheoryBlock {
  type: string;
  text?: string;
  language?: string;
  style?: string;
}

interface Lesson {
  id: number;
  title: string;
  theory: TheoryBlock[];
  exercises: Exercise[];
  xp_reward: number;
  lesson_completed?: boolean;
  xp_earned_on_open?: number;
}

interface ModuleData {
  id: number;
  title: string;
  course: {
    id: number;
    slug: string;
    title: string;
  };
  lessons: Array<{
    id: number;
    title: string;
    order_index: number;
  }>;
}

interface LessonProgress {
  completed_exercise_ids: number[];
  lesson_completed: boolean;
}

export default function LessonPage() {
  const params = useParams<{
    slug: string;
    moduleId: string;
    lessonId: string;
  }>();
  const { refresh } = useAuth();
  const slug = params?.slug;
  const moduleId = params?.moduleId;
  const lessonId = params?.lessonId ? parseInt(params.lessonId, 10) : null;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<number[]>([]);
  const [theoryXpToast, setTheoryXpToast] = useState<number | null>(null);

  useEffect(() => {
    if (!slug || !moduleId || !lessonId) return;

    const fetchLesson = async () => {
      try {
        const [lessonRes, moduleRes] = await Promise.all([
          fetch(`${API_BASE}/api/lessons/${lessonId}`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE}/api/courses/${slug}/modules/${moduleId}`, {
            credentials: 'include',
          }),
        ]);
        const progressRes = await fetch(`${API_BASE}/api/lessons/${lessonId}/progress`, {
          credentials: 'include',
        });

        const lessonData = await lessonRes.json();
        if (!lessonRes.ok) {
          throw new Error(lessonData?.detail || 'Не удалось загрузить урок');
        }

        const moduleResData = await moduleRes.json();
        if (!moduleRes.ok) {
          throw new Error(
            moduleResData?.detail || 'Не удалось загрузить модуль',
          );
        }
        const progressData: LessonProgress | null = progressRes.ok
          ? ((await progressRes.json()) as LessonProgress)
          : null;

        const normalizedLesson: Lesson = {
          id: lessonData.id,
          title: lessonData.title,
          theory: Array.isArray(lessonData.theory) ? lessonData.theory : [],
          exercises: Array.isArray(lessonData.exercises)
            ? lessonData.exercises
            : [],
          xp_reward:
            typeof lessonData.xp_reward === 'number' ? lessonData.xp_reward : 0,
          lesson_completed: Boolean(lessonData.lesson_completed),
          xp_earned_on_open:
            typeof lessonData.xp_earned_on_open === 'number'
              ? lessonData.xp_earned_on_open
              : 0,
        };

        setLesson(normalizedLesson);
        setModuleData(moduleResData as ModuleData);
        setCompletedExerciseIds(
          Array.isArray(progressData?.completed_exercise_ids)
            ? progressData!.completed_exercise_ids
            : [],
        );
        if ((normalizedLesson.xp_earned_on_open ?? 0) > 0) {
          setTheoryXpToast(normalizedLesson.xp_earned_on_open ?? 0);
          void refresh();
        }
        setError(null);
      } catch (err) {
        setLesson(null);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    void fetchLesson();
  }, [slug, moduleId, lessonId, refresh]);

  useEffect(() => {
    if (!lesson?.id) {
      setActiveExerciseIndex(0);
      return;
    }
    const storageKey = `${ACTIVE_EXERCISE_KEY_PREFIX}${lesson.id}`;
    const raw =
      typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    const maxIndex = Math.max(0, lesson.exercises.length - 1);
    const requestedIndex =
      Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, maxIndex) : 0;
    const requestedExercise = lesson.exercises[requestedIndex];
    const fallbackOpenIndex = lesson.exercises.findIndex((ex) => !ex.locked);
    const safeIndex =
      requestedExercise && !requestedExercise.locked
        ? requestedIndex
        : fallbackOpenIndex >= 0
          ? fallbackOpenIndex
          : 0;
    setActiveExerciseIndex(safeIndex);
    setTheoryXpToast(null);
  }, [lesson?.id, lesson?.exercises.length]);

  useEffect(() => {
    if (!lesson?.id || typeof window === 'undefined') return;
    window.localStorage.setItem(
      `${ACTIVE_EXERCISE_KEY_PREFIX}${lesson.id}`,
      String(activeExerciseIndex),
    );
  }, [lesson?.id, activeExerciseIndex]);

  useEffect(() => {
    if (!theoryXpToast) return;
    const timeout = setTimeout(() => setTheoryXpToast(null), 1400);
    return () => clearTimeout(timeout);
  }, [theoryXpToast]);

  // Навигация между уроками
  const currentLessonIndex =
    moduleData?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  const currentLessonNumber =
    currentLessonIndex >= 0
      ? (moduleData?.lessons[currentLessonIndex].order_index ?? currentLessonIndex) + 1
      : null;
  const prevLesson =
    currentLessonIndex > 0 ? moduleData?.lessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 &&
    currentLessonIndex < (moduleData?.lessons.length ?? 0) - 1
      ? moduleData?.lessons[currentLessonIndex + 1]
      : null;

  const activeExercise =
    lesson && lesson.exercises.length > 0
      ? lesson.exercises[Math.min(activeExerciseIndex, lesson.exercises.length - 1)]
      : null;

  const handleExerciseCompleted = (exerciseId: number) => {
    setCompletedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev : [...prev, exerciseId],
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <AppHeader />
        <main className="flex items-center justify-center px-4 py-6">
          <div className="text-[var(--color-text-muted)] font-mono">
            Загрузка урока...
          </div>
        </main>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-6 text-sm text-[var(--color-danger)]">
            {error || 'Урок не найден'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div
          className={`mx-auto w-full ${
            lesson.exercises.length > 0 ? 'max-w-none' : 'max-w-6xl'
          }`}
        >
          {/* Хлебные крошки */}
          <nav className="mb-4 text-sm text-[var(--color-text-muted)]">
            <Link
              href={`/courses/${moduleData?.course.slug}`}
              className="hover:text-[var(--color-text)]"
            >
              {moduleData?.course.title}
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/courses/${moduleData?.course.slug}/modules/${moduleId}`}
              className="hover:text-[var(--color-text)]"
            >
              {moduleData?.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--color-text)]">
              {currentLessonNumber ? `Урок ${currentLessonNumber} — ` : ''}
              {lesson.title}
            </span>
          </nav>

          {/* Контент урока */}
          {lesson.exercises.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Левая часть — теория */}
              <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <div className="mb-4 text-xs font-mono uppercase tracking-widest text-[var(--color-brand)]">
                  Теория
                </div>
                <TheoryRenderer blocks={lesson.theory} />
              </div>

              {/* Правая часть — задания */}
              <div className="min-w-0 flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-widest text-[var(--color-brand)]">
                    Задания
                  </div>
                  <div className="flex items-center gap-2">
                    {activeExercise?.requires_course_purchase ? (
                      <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Покупка курса
                      </span>
                    ) : null}
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      {activeExerciseIndex + 1}/{lesson.exercises.length}
                    </span>
                  </div>
                </div>

                <div className="mb-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.exercises.map((exercise, index) => {
                      const isActive = index === activeExerciseIndex;
                      const isCompleted = completedExerciseIds.includes(exercise.id);
                      const isLocked = Boolean(exercise.locked);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => setActiveExerciseIndex(index)}
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-mono font-semibold transition-colors ${
                            isLocked
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                              : isActive && isCompleted
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isActive
                                ? 'border-[var(--color-brand)]/55 bg-[var(--color-brand)]/22 text-[var(--color-brand)]'
                                : isCompleted
                                  ? 'border-emerald-500/55 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:border-[var(--color-brand)]/35 hover:text-[var(--color-text)]'
                          }`}
                          title={
                            isLocked
                              ? `Задание ${index + 1} (доступно после покупки курса)`
                              : isCompleted
                              ? `Задание ${index + 1} (выполнено)`
                              : `Задание ${index + 1}`
                          }
                        >
                          {isLocked ? '🔒' : index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {activeExercise ? (
                    activeExercise.locked ? (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-600 dark:text-amber-400">
                        {activeExercise.lock_reason === 'course_purchase_required'
                          ? 'Это задание открывается после покупки курса.'
                          : 'Это задание сейчас недоступно.'}
                      </div>
                    ) : activeExercise.type === 'quiz' ? (
                      <Quiz
                        key={activeExercise.id}
                        exercise={activeExercise}
                        onCompleted={handleExerciseCompleted}
                      />
                    ) : activeExercise.type === 'gap_fill' ? (
                      <GapFill
                        key={activeExercise.id}
                        exercise={activeExercise}
                        onCompleted={handleExerciseCompleted}
                      />
                    ) : activeExercise.type === 'terminal_command' ? (
                      <TerminalCommand
                        key={activeExercise.id}
                        exercise={activeExercise}
                        onCompleted={handleExerciseCompleted}
                      />
                    ) : activeExercise.type === 'code_runner' ? (
                      <CodeRunner
                        exerciseId={activeExercise.id}
                        task={activeExercise.content.task || ''}
                        starterCode={activeExercise.content.starter_code || ''}
                        onCompleted={handleExerciseCompleted}
                      />
                    ) : (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
                        Тип задания «{activeExercise.type}» будет доступен в
                        следующей версии.
                      </div>
                    )
                  ) : null}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setActiveExerciseIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={activeExerciseIndex === 0}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-mono disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ← Предыдущее
                    </button>
                    <button
                      onClick={() =>
                        setActiveExerciseIndex((prev) =>
                          Math.min(lesson.exercises.length - 1, prev + 1),
                        )
                      }
                      disabled={activeExerciseIndex >= lesson.exercises.length - 1}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-mono disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Следующее →
                    </button>
                    <div className="ml-auto text-xs font-mono text-[var(--color-text-muted)]">
                      Выполнено: {completedExerciseIds.length}/
                      {lesson.exercises.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="relative">
                {theoryXpToast ? (
                  <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-full border border-[var(--color-success)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-mono text-[var(--color-success)] animate-bounce">
                    +{theoryXpToast} XP
                  </div>
                ) : null}
                <TheoryRenderer blocks={lesson.theory} />
              </div>
            </div>
          )}

          {/* Навигация между уроками */}
          <div className="mt-8 flex items-center gap-4">
            {prevLesson ? (
              <Link
                href={`/courses/${moduleData?.course.slug}/modules/${moduleId}/lessons/${prevLesson.id}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                ← Урок {prevLesson.order_index + 1}
              </Link>
            ) : null}

            <div className="flex-1" />

            {nextLesson ? (
              <Link
                href={`/courses/${moduleData?.course.slug}/modules/${moduleId}/lessons/${nextLesson.id}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                Урок {nextLesson.order_index + 1} →
              </Link>
            ) : (
              <Link
                href={`/courses/${moduleData?.course.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
              >
                К курсу →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
