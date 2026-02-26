'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const CODE_DRAFT_KEY_PREFIX = 'devdrill:code-runner:draft:';

// Используем локальный Monaco из /public, чтобы не зависеть от CDN.
loader.config({ paths: { vs: '/monaco/vs' } });

async function tryRefreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface CodeRunnerProps {
  exerciseId: number;
  task: string;
  starterCode: string;
  onCompleted?: (exerciseId: number) => void;
}

interface RunResult {
  stdout: string;
  stderr: string;
  passed: boolean;
  exit_code: number;
  display_passed?: boolean | null;
  xp_earned?: number;
}

export default function CodeRunner({
  exerciseId,
  task,
  starterCode,
  onCompleted,
}: CodeRunnerProps) {
  const { refresh } = useAuth();
  const { mode } = useTheme();
  const [code, setCode] = useState(starterCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const cacheRef = useRef<Record<number, { code: string; result: RunResult | null }>>({});
  const codeRef = useRef(code);
  const resultRef = useRef(result);
  const prevExerciseIdRef = useRef<number>(exerciseId);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const text = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      // Monaco в dev-режиме часто логирует отменённые операции как ERR Canceled.
      // Для UX это шум: подавляем только этот конкретный кейс.
      if (text.includes('ERR Canceled: Canceled') || text.includes('Canceled: Canceled')) {
        return;
      }
      originalConsoleError(...args);
    };
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useLayoutEffect(() => {
    const prevExerciseId = prevExerciseIdRef.current;
    const shouldPersistPrevious = hasMountedRef.current && prevExerciseId !== exerciseId;
    if (typeof window !== 'undefined' && shouldPersistPrevious) {
      // TEMP DEBUG: отслеживаем, что сохраняем перед переключением упражнения.
      console.log('[CodeRunner:draft] save-on-switch', {
        prevExerciseId,
        key: `${CODE_DRAFT_KEY_PREFIX}${prevExerciseId}`,
        length: codeRef.current.length,
      });
      window.localStorage.setItem(
        `${CODE_DRAFT_KEY_PREFIX}${prevExerciseId}`,
        codeRef.current,
      );
    }
    cacheRef.current[prevExerciseId] = {
      code: codeRef.current,
      result: resultRef.current,
    };

    const storageKey = `${CODE_DRAFT_KEY_PREFIX}${exerciseId}`;
    const storedDraft =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(storageKey)
        : null;
    // TEMP DEBUG: отслеживаем, что читаем при загрузке упражнения.
    console.log('[CodeRunner:draft] load', {
      exerciseId,
      key: storageKey,
      hasDraft: storedDraft !== null,
      length: storedDraft?.length ?? 0,
    });
    const cached = cacheRef.current[exerciseId];
    if (storedDraft !== null) {
      setCode(storedDraft);
      setResult(cached?.result ?? null);
    } else if (cached) {
      setCode(cached.code);
      setResult(cached.result);
    } else {
      setCode(starterCode);
      setResult(null);
    }
    setLoading(false);
    prevExerciseIdRef.current = exerciseId;
    hasMountedRef.current = true;
  }, [exerciseId, starterCode]);

  useEffect(() => {
    if (!xpToast) return;
    const timeout = setTimeout(() => setXpToast(null), 1400);
    return () => clearTimeout(timeout);
  }, [xpToast]);

  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason = e.reason as
        | {
            type?: string;
            name?: string;
            message?: string;
            msg?: string;
            code?: string;
            canceled?: boolean;
            cancelled?: boolean;
            isCanceled?: boolean;
            isCancelled?: boolean;
          }
        | undefined;
      const text = `${reason?.type ?? ''} ${reason?.name ?? ''} ${reason?.message ?? ''} ${reason?.msg ?? ''}`.toLowerCase();
      const isCancellation =
        text.includes('cancelation') ||
        text.includes('cancellation') ||
        text.includes('abort') ||
        reason?.code?.toLowerCase() === 'aborted' ||
        reason?.canceled === true ||
        reason?.cancelled === true ||
        reason?.isCanceled === true ||
        reason?.isCancelled === true;

      if (isCancellation) e.preventDefault();
    };
    window.addEventListener('unhandledrejection', handler, { capture: true });
    return () =>
      window.removeEventListener('unhandledrejection', handler, {
        capture: true,
      });
  }, []);

  const handleBeforeMount = (monacoInstance: {
    editor: {
      defineTheme: (
        name: string,
        themeData: {
          base: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
          inherit: boolean;
          rules: unknown[];
          colors: Record<string, string>;
        },
      ) => void;
    };
  }) => {
    monacoInstance.editor.defineTheme('dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#111827' },
    });
    monacoInstance.editor.defineTheme('light-custom', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#eef2ff' },
    });
  };

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res = await fetch(`${API_BASE}/api/run-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, exercise_id: exerciseId }),
      });

      if (res.status === 401) {
        const refreshed = await tryRefreshSession();
        if (refreshed) {
          res = await fetch(`${API_BASE}/api/run-code`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, exercise_id: exerciseId }),
          });
        }
      }
      const data = await res.json();

      if (!res.ok) {
        const detail =
          typeof data?.detail === 'string'
            ? data.detail
            : 'Проверяющая система вернула ошибку';
        setResult({
          stdout: 'Задание не проверено из-за ошибки конфигурации/запроса.',
          stderr: `HTTP ${res.status}: ${detail}`,
          passed: false,
          exit_code: -1,
        });
        return;
      }

      setResult({
        stdout: typeof data?.stdout === 'string' ? data.stdout : '',
        stderr: typeof data?.stderr === 'string' ? data.stderr : '',
        passed: Boolean(data?.passed),
        exit_code: typeof data?.exit_code === 'number' ? data.exit_code : -1,
        display_passed:
          typeof data?.display_passed === 'boolean'
            ? data.display_passed
            : null,
        xp_earned: typeof data?.xp_earned === 'number' ? data.xp_earned : 0,
      });
      if (Boolean(data?.passed)) onCompleted?.(exerciseId);
      if (typeof data?.xp_earned === 'number' && data.xp_earned > 0) {
        setXpToast(data.xp_earned);
        void refresh();
      }
    } catch (e) {
      console.error('run-code error:', e);
      setResult({
        stdout: '',
        stderr: 'Не удалось подключиться к серверу',
        passed: false,
        exit_code: -1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode(starterCode);
    setResult(null);
    if (typeof window !== 'undefined') {
      // TEMP DEBUG: явная очистка draft кнопкой "сброс".
      console.log('[CodeRunner:draft] reset', {
        exerciseId,
        key: `${CODE_DRAFT_KEY_PREFIX}${exerciseId}`,
      });
      window.localStorage.removeItem(`${CODE_DRAFT_KEY_PREFIX}${exerciseId}`);
    }
  };

  const handleCodeChange = (val: string | undefined) => {
    const nextCode = val || '';
    setCode(nextCode);
    if (typeof window !== 'undefined') {
      // TEMP DEBUG: сохранение draft во время ввода.
      console.log('[CodeRunner:draft] save-on-change', {
        exerciseId,
        key: `${CODE_DRAFT_KEY_PREFIX}${exerciseId}`,
        length: nextCode.length,
      });
      window.localStorage.setItem(
        `${CODE_DRAFT_KEY_PREFIX}${exerciseId}`,
        nextCode,
      );
    }
  };

  const visualPassed =
    result?.display_passed === undefined || result?.display_passed === null
      ? result?.passed
      : result.display_passed;

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-[var(--color-border)] overflow-hidden">
      {xpToast ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-[var(--color-success)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-mono text-[var(--color-success)] animate-bounce">
          +{xpToast} XP
        </div>
      ) : null}
      {/* Шапка с заданием */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand)]">
            Задание
          </span>
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-sm leading-relaxed text-[var(--color-text)]">
                {children}
              </p>
            ),
            code: ({ children }) => (
              <code className="rounded bg-[var(--color-code-bg)] px-1 py-0.5 font-mono text-xs text-[var(--color-code-text)]">
                {children}
              </code>
            ),
          }}
        >
          {task}
        </ReactMarkdown>
      </div>

      {/* Редактор */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)]">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            solution.py
          </span>
          <button
            onClick={handleReset}
            className="font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ↺ сброс
          </button>
        </div>
        <Editor
          beforeMount={handleBeforeMount}
          height="220px"
          language="python"
          theme={mode === 'dark' ? 'dark-custom' : 'light-custom'}
          value={code}
          onChange={handleCodeChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            lineNumbersMinChars: 2,
            renderLineHighlight: 'line',
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Кнопка запуска */}
      <div className="flex justify-end px-4 pb-4 pt-4 bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className={`group relative inline-block rounded-2xl p-px text-white transition-all duration-300 ease-in-out active:duration-0 ${
            loading
              ? 'cursor-not-allowed opacity-80'
              : 'cursor-pointer hover:scale-105 active:scale-95'
          } ${
            mode === 'dark'
              ? 'bg-neutral-900 hover:shadow-[0_10px_22px_rgba(16,185,129,0.35)]'
              : 'bg-neutral-800 hover:shadow-[0_10px_22px_rgba(16,185,129,0.22)]'
          }`}
        >
          <span
            className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-600 p-[2px] transition-opacity duration-500 ${
              loading ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          <span
            className={`relative z-10 block min-w-[126px] rounded-2xl px-3 py-2 ${
              mode === 'dark' ? 'bg-neutral-950' : 'bg-neutral-100'
            }`}
          >
            <span
              className={`block w-full text-center text-xs font-semibold transition-all duration-500 ${
                loading
                  ? 'text-[var(--color-text-muted)]'
                  : mode === 'dark'
                    ? 'text-white group-hover:text-emerald-300'
                    : 'text-black group-hover:text-emerald-700'
              }`}
            >
              {loading ? 'Запускаем...' : 'Запустить'}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-all duration-500 ${
                loading
                  ? 'text-[var(--color-text-muted)]'
                  : mode === 'dark'
                    ? 'text-white group-hover:translate-x-0.5 group-hover:text-emerald-300'
                    : 'text-black group-hover:translate-x-0.5 group-hover:text-emerald-700'
              }`}
              aria-hidden="true"
            >
              <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" />
            </svg>
          </span>
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className="border-t border-[var(--color-border)]">
          <div
            className={`px-4 py-2.5 flex items-center gap-2 font-mono text-sm font-semibold ${
              visualPassed
                ? 'bg-green-500/10 text-green-400 border-b border-green-500/20'
                : 'bg-red-500/10 text-red-400 border-b border-red-500/20'
            }`}
          >
            <span>
              {visualPassed
                ? '✅ PASSED'
                : result.passed
                  ? '❌ FAILED (зачтено)'
                  : '❌ FAILED'}
            </span>
            {result.xp_earned && result.xp_earned > 0 ? (
              <span className="ml-auto text-xs font-mono text-[var(--color-brand)] animate-pulse">
                +{result.xp_earned} XP
              </span>
            ) : null}
          </div>
          <div className="bg-[var(--color-code-bg)] text-[var(--color-code-text)]">
            {result.stdout ? (
              <div className="border-b border-[var(--color-border)] p-4">
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Сообщение
                </div>
                <pre className="font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {result.stdout}
                </pre>
              </div>
            ) : null}
            {result.stderr ? (
              <div className="p-4">
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Детали
                </div>
                <pre className="font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {result.stderr}
                </pre>
              </div>
            ) : null}
            {!result.stdout && !result.stderr ? (
              <div className="p-4 font-mono text-xs leading-relaxed">
                Нет вывода от проверяющей системы.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
