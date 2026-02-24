import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Block {
  type: string
  text?: string
  language?: string
  style?: string
  title?: string
  subtitle?: string
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-[var(--color-text-muted)] text-base leading-relaxed">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-brand)] underline hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--color-text)]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-[var(--color-text-muted)]">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-[var(--color-code-bg)] text-[var(--color-code-text)] font-mono text-sm px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
}

export default function TheoryRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.type) {

          case 'heading':
            return (
              <h2 key={index} className="text-xl font-bold text-center">
                {block.text}
              </h2>
            )

          case 'paragraph':
            return (
              <div key={index}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {block.text || ''}
                </ReactMarkdown>
              </div>
            )

          case 'code':
            return (
              <pre key={index} className="bg-[var(--color-code-bg)] rounded-lg p-4 overflow-x-auto">
                <code className="text-sm font-mono text-[var(--color-code-text)] whitespace-pre">
                  {block.text}
                </code>
              </pre>
            )

          case 'callout': {
            const styles = {
              info:    'border-[var(--color-brand)] bg-[var(--color-code-bg)] text-[var(--color-brand)]',
              warning: 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
            }
            const icons = { info: 'ℹ️', warning: '⚠️' }
            const style = styles[block.style as keyof typeof styles] || styles.info
            const icon  = icons[block.style as keyof typeof icons]  || icons.info
            return (
              <div key={index} className={`border rounded-lg p-4 text-sm leading-relaxed ${style}`}>
                <span className="mr-2">{icon}</span>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {block.text || ''}
                </ReactMarkdown>
              </div>
            )
          }

          case 'hero':
            return (
              <div key={index} className="text-center py-4">
                <h1 className="text-2xl font-bold mb-2">{block.title}</h1>
                {block.subtitle && (
                  <p className="text-[var(--color-text-muted)] text-sm">{block.subtitle}</p>
                )}
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}