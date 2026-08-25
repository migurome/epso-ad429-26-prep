import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

interface MarkdownProps {
  children: string
  className?: string
  compact?: boolean
}

export function Markdown({ children, className, compact }: MarkdownProps) {
  return (
    <div className={clsx(compact && '[&>p]:mb-0', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="mb-3 mt-6 text-xl font-bold text-slate-900 first:mt-0" {...props} />,
          h2: (props) => <h2 className="mb-3 mt-6 text-lg font-bold text-slate-900 first:mt-0" {...props} />,
          h3: (props) => <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900 first:mt-0" {...props} />,
          h4: (props) => <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-900 first:mt-0" {...props} />,
          p: (props) => <p className="mb-3 leading-relaxed text-slate-700 last:mb-0" {...props} />,
          ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-700 last:mb-0" {...props} />,
          ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-slate-700 last:mb-0" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="mb-3 border-l-4 border-eu-blue/30 pl-4 text-slate-600 last:mb-0 [&>p]:italic"
              {...props}
            />
          ),
          code: (props) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]" {...props} />,
          table: (props) => (
            <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-slate-100" {...props} />,
          th: (props) => (
            <th className="border border-slate-200 px-2.5 py-1.5 text-left font-semibold text-slate-700" {...props} />
          ),
          td: (props) => <td className="border border-slate-200 px-2.5 py-1.5 text-slate-700" {...props} />,
          a: (props) => (
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a className="text-eu-blue underline hover:text-eu-blue-dark" target="_blank" rel="noreferrer" {...props} />
          ),
          hr: () => <hr className="my-4 border-slate-200" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
