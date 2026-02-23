interface Block {
  type: string
  text?: string
  language?: string
  style?: string
  align?: 'left' | 'center' | 'right'
  title?: string
  subtitle?: string
}

export default function TheoryRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.type) {

          case 'heading': {
            const alignClass =
              block.align === 'center' ? 'text-center' :
              block.align === 'right'  ? 'text-right'  : ''
            return (
              <h2 key={index} className={`text-xl font-bold ${alignClass}`}>
                {block.text}
              </h2>
            )
          }

          case 'paragraph':
            return (
              <p key={index} className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                {block.text}
              </p>
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
                {block.text}
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