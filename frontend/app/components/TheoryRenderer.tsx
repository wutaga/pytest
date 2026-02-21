interface Block {
  type: string
  text?: string
  language?: string
  style?: string
}

export default function TheoryRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.type) {

          case 'heading':
            return (
              <h2 key={index} className="text-xl font-bold text-white">
                {block.text}
              </h2>
            )

          case 'paragraph':
            return (
              <p key={index} className="text-gray-300 text-sm leading-relaxed">
                {block.text}
              </p>
            )

          case 'code':
            return (
              <pre key={index} className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <code className="text-sm font-mono text-green-300 whitespace-pre">
                  {block.text}
                </code>
              </pre>
            )

          case 'callout':
            const styles = {
              info:    'border-blue-500/40 bg-blue-500/10 text-blue-300',
              warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
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

          default:
            return null
        }
      })}
    </div>
  )
}