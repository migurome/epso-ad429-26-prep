import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../lib/useT'

interface PhaseCardProps {
  to: string
  order?: number
  title: string
  description: string
  meta?: string
  icon?: ReactNode
}

export function PhaseCard({ to, order, title, description, meta, icon }: PhaseCardProps) {
  const t = useT()
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-eu-blue hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-eu-blue">{icon}</div>}
          {order && (
            <span className="text-xs font-semibold text-slate-400">
              {t('phase_n', { n: order })}
            </span>
          )}
        </div>
        <ArrowRight
          size={16}
          className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-eu-blue"
        />
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-slate-500">{description}</p>
      {meta && (
        <p className="mt-3 text-xs font-medium text-slate-400">{meta}</p>
      )}
    </Link>
  )
}
