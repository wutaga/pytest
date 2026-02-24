import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TerminalBlock from './TerminalBlock'
import rehypeRaw from 'rehype-raw'
import { useTheme } from './ThemeProvider'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism'



interface Block {
  type: string
  text?: string
  language?: string
  style?: string
  title?: string
  subtitle?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  lines?: string[]
  speed?: number
  icon?: string
  icon_position?: 'left' | 'right'
  icon_size?: string
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
  <p className="text-[var(--color-text-muted)] text-base leading-relaxed text-justify">
    {children}
  </p>
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
  ul: ({ children }: { children?: React.ReactNode }) => (
  <ul className="list-disc list-inside space-y-1 text-[var(--color-text-muted)] text-base">
    {children}
  </ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
}

export default function TheoryRenderer({ blocks }: { blocks: Block[] }) {
  const { mode } = useTheme()
  
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.type) {

          case 'heading': {
            const sizeMap: Record<string, string> = {
              '6':  'w-6 h-6',
              '8':  'w-8 h-8',
              '10': 'w-10 h-10',
              '12': 'w-12 h-12',
              '14': 'w-14 h-14',
              '16': 'w-16 h-16',
              '20': 'w-20 h-20',
              '24': 'w-24 h-24',
              '30': 'w-30 h-30',
            }
            const sizeClass = sizeMap[block.icon_size || '8'] || 'w-8 h-8'
            const icon = block.icon ? (
              <img src={block.icon} alt="" className={`${sizeClass} object-contain`} />
            ) : null
            return (
              <h2 key={index} className="text-xl font-bold text-center flex items-center justify-center gap-1">
                {block.icon_position !== 'right' && icon}
                {block.text}
                {block.icon_position === 'right' && icon}
              </h2>
            )
          }

          case 'paragraph':
            return (
              <div key={index}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}>
                  {block.text || ''}
                </ReactMarkdown>
              </div>
            )

          case 'code':
            return (
              <SyntaxHighlighter
                key={index}
                language={block.language || 'python'}
                style={mode === 'dark' ? vscDarkPlus : prism}
                customStyle={{
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  margin: 0,
                  background: 'var(--color-code-bg)',
                }}
              >
                {block.text || ''}
              </SyntaxHighlighter>
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}>
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

          case 'image': {
            const sizeClass =
              block.size === 'sm'   ? 'max-w-sm'  :
              block.size === 'lg'   ? 'max-w-lg'  :
              block.size === 'xl'   ? 'max-w-xl'  :
              block.size === 'full' ? 'w-full'    :
              'max-w-md'
            return (
              <div key={index} className={`${sizeClass} mx-auto rounded-lg overflow-hidden`}>
                <img
                  src={block.src}
                  alt={block.alt || ''}
                  className="w-full h-auto"
                />
              </div>
            )
          }

          case 'terminal':
            return (
              <TerminalBlock
                key={index}
                lines={block.lines || []}
                speed={block.speed}
              />
            )

          default:
            return null
        }
      })}
    </div>
  )
}