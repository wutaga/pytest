'use client'

import { useEffect, useState, useRef } from 'react'

interface TerminalBlockProps {
  lines: string[]
  speed?: number // мс между символами, по умолчанию 40
}

export default function TerminalBlock({ lines, speed = 40 }: TerminalBlockProps) {
  const [displayed, setDisplayed] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState(0)
  const [currentChar, setCurrentChar] = useState(0)
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) return
    if (currentLine >= lines.length) {
      setDone(true)
      return
    }

    const line = lines[currentLine]

    if (currentChar < line.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => {
          const updated = [...prev]
          updated[currentLine] = (updated[currentLine] || '') + line[currentChar]
          return updated
        })
        setCurrentChar(c => c + 1)
      }, speed)
      return () => clearTimeout(timeout)
    } else {
      const timeout = setTimeout(() => {
        setCurrentLine(l => l + 1)
        setCurrentChar(0)
      }, speed * 3)
      return () => clearTimeout(timeout)
    }
  }, [currentLine, currentChar, done, lines, speed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayed])

  const getLineStyle = (line: string) => {
    if (line.startsWith('$')) return 'text-[var(--color-brand)]'
    if (line.includes('passed') || line.includes('✅') || line.includes('PASSED'))
      return 'text-[var(--color-success)]'
    if (line.includes('failed') || line.includes('❌') || line.includes('FAILED') || line.includes('ERROR'))
      return 'text-[var(--color-danger)]'
    if (line.startsWith('#')) return 'text-[var(--color-text-muted)]'
    return 'text-[var(--color-code-text)]'
  }

  const handleReplay = () => {
    setDisplayed([])
    setCurrentLine(0)
    setCurrentChar(0)
    setDone(false)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-code-bg)] overflow-hidden">

      {/* Шапка терминала */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
        </div>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">terminal</span>
        {done && (
          <button
            onClick={handleReplay}
            className="font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ↺ повторить
          </button>
        )}
      </div>

      {/* Контент */}
      <div className="p-4 font-mono text-sm min-h-[80px]">
        {displayed.map((line, i) => (
          <div key={i} className={`leading-relaxed ${getLineStyle(lines[i])}`}>
            {line}
            {i === currentLine && !done && (
              <span className="animate-pulse">▋</span>
            )}
          </div>
        ))}
        {!done && displayed.length === 0 && (
          <span className="animate-pulse text-[var(--color-brand)]">▋</span>
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  )
}