import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  hint?: string
}

export function EmptyState({ icon, title, description, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {hint && (
        <p className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}
