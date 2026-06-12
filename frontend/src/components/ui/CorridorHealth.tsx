interface CorridorHealthProps {
  score: number
  label: string
  trend?: string
  details?: {
    avg_delay?: number
    congestion_index?: number
    active_incidents?: number
    throughput_24h?: number
  }
  size?: 'sm' | 'md' | 'lg'
}

export function CorridorHealthScore({ score, label, trend, details, size = 'md' }: CorridorHealthProps) {
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10B981', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
    if (s >= 60) return { stroke: '#0EA5E9', text: 'text-kt-blue', bg: 'bg-kt-blue/10', border: 'border-kt-blue/20' }
    if (s >= 40) return { stroke: '#F59E0B', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
    return { stroke: '#EF4444', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
  }

  const colors = getColor(score)
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference

  const svgSize = size === 'lg' ? 100 : size === 'md' ? 80 : 60
  const r = size === 'lg' ? 42 : size === 'md' ? 34 : 26
  const cx = svgSize / 2
  const cy = svgSize / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (score / 100) * circ

  return (
    <div className={`kt-card border p-4 ${colors.border}`}>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="-rotate-90">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle
              cx={cx} cy={cy} r={r} fill="none"
              stroke={colors.stroke} strokeWidth="6"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-display font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base'} ${colors.text}`}>
              {score.toFixed(0)}
            </span>
          </div>
        </div>
        <div>
          <div className="font-display font-semibold text-white text-sm">Corridor Health</div>
          <div className={`text-lg font-bold font-display ${colors.text}`}>{label}</div>
          {trend && (
            <div className="text-xs text-slate-400 mt-0.5">
              {trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Stable'}
            </div>
          )}
        </div>
      </div>
      {details && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {details.avg_delay !== undefined && (
            <div>
              <div className="kt-label">Avg Delay</div>
              <div className="text-sm font-medium text-white">{details.avg_delay.toFixed(0)}m</div>
            </div>
          )}
          {details.active_incidents !== undefined && (
            <div>
              <div className="kt-label">Incidents</div>
              <div className="text-sm font-medium text-white">{details.active_incidents}</div>
            </div>
          )}
          {details.throughput_24h !== undefined && (
            <div>
              <div className="kt-label">Deliveries 24h</div>
              <div className="text-sm font-medium text-white">{details.throughput_24h}</div>
            </div>
          )}
          {details.congestion_index !== undefined && (
            <div>
              <div className="kt-label">Congestion</div>
              <div className="text-sm font-medium text-white">{(details.congestion_index * 100).toFixed(0)}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
