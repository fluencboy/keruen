import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; label?: string }
  icon?: ReactNode
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
  loading?: boolean
}

const colorMap = {
  blue: { icon: 'bg-kt-blue/15 text-kt-blue', border: 'border-kt-blue/20', glow: 'hover:border-kt-blue/40' },
  green: { icon: 'bg-green-500/15 text-green-400', border: 'border-green-500/20', glow: 'hover:border-green-400/40' },
  amber: { icon: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/20', glow: 'hover:border-amber-400/40' },
  red: { icon: 'bg-red-500/15 text-red-400', border: 'border-red-500/20', glow: 'hover:border-red-400/40' },
  purple: { icon: 'bg-purple-500/15 text-purple-400', border: 'border-purple-500/20', glow: 'hover:border-purple-400/40' },
  teal: { icon: 'bg-teal-500/15 text-teal-400', border: 'border-teal-500/20', glow: 'hover:border-teal-400/40' },
}

export function KPICard({ label, value, unit, trend, icon, color = 'blue', loading }: KPICardProps) {
  const colors = colorMap[color]

  return (
    <div className={cn('kt-card p-4 border transition-all duration-200', colors.border, colors.glow)}>
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('p-2 rounded-lg', colors.icon)}>
            {icon}
          </div>
        )}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            trend.direction === 'up' ? 'bg-green-500/10 text-green-400' :
            trend.direction === 'down' ? 'bg-red-500/10 text-red-400' :
            'bg-slate-500/10 text-slate-400'
          )}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            {trend.label && <span>{trend.label}</span>}
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 mt-1">
          <div className="h-7 w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
            {unit && <span className="text-sm text-slate-400">{unit}</span>}
          </div>
          <div className="kt-label mt-1">{label}</div>
        </>
      )}
    </div>
  )
}
