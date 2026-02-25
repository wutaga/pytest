'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from './ThemeProvider';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface CodeRunnerProps {
  exerciseId: number;
  task: string;
  starterCode: string;
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
}: CodeRunnerProps) {
  const { mode } = useTheme();
  const [code, setCode] = useState(starterCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch(`${API_BASE}/api/run-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, exercise_id: exerciseId }),
      });
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
  };

  const visualPassed =
    result?.display_passed === undefined || result?.display_passed === null
      ? result?.passed
      : result.display_passed;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] overflow-hidden">
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
          onChange={(val) => setCode(val || '')}
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
      <div className="px-4 pb-3 bg-[var(--color-surface)]">
        <button
          onClick={handleRun}
          disabled={loading}
          className={`w-full rounded-lg py-2.5 font-mono text-sm font-semibold transition-all ${
            loading
              ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              : 'bg-[var(--color-brand)] text-white hover:opacity-90'
          }`}
        >
          {loading ? '⟳ Запускаем pytest...' : '▶ Запустить'}
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
              <span className="ml-auto text-xs font-mono text-[var(--color-brand)]">
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
