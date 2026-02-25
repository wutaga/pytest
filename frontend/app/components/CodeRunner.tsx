'use client'

import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { useTheme } from './ThemeProvider'

interface CodeRunnerProps {
  task: string
  starterCode: string
  expectedOutput?: string
}

interface RunResult {
  stdout: string
  stderr: string
  passed: boolean
  exit_code: number
}

export default function CodeRunner({ task, starterCode, expectedOutput }: CodeRunnerProps) {
  const { mode } = useTheme()
  const [code, setCode] = useState(starterCode)
  const [result, setResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('http://localhost:8000/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({
        stdout: '',
        stderr: 'Не удалось подключиться к серверу',
        passed: false,
        exit_code: -1,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCode(starterCode)
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] overflow-hidden">

      {/* Шапка с заданием */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand)]">
            Задание
          </span>
        </div>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">{task}</p>
      </div>

      {/* Редактор */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)]">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">solution.py</span>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              ↺ сброс
            </button>
          </div>
        </div>
        <Editor
          height="220px"
          language="python"
          value={code}
          onChange={(val) => setCode(val || '')}
          theme={mode === 'dark' ? 'vs-dark' : 'light'}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
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

          {/* Статус */}
          <div className={`px-4 py-2.5 flex items-center gap-2 font-mono text-sm font-semibold ${
            result.passed
              ? 'bg-green-500/10 text-green-400 border-b border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-b border-red-500/20'
          }`}>
            {result.passed ? '✅ PASSED' : '❌ FAILED'}
          </div>

          {/* Вывод */}
          <pre className="p-4 font-mono text-xs leading-relaxed text-[var(--color-code-text)] bg-[var(--color-code-bg)] overflow-x-auto whitespace-pre-wrap">
            {result.stdout || result.stderr}
          </pre>

        </div>
      )}

    </div>
  )
}