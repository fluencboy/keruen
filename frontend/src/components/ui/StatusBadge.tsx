import { cn, STATUS_COLORS } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  pulse?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Created',
  approved: 'Approved',
  slot_assigned: 'Slot Assigned',
  in_transit: 'In Transit',
  checkpoint_processing: 'At Checkpoint',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  available: 'Available',
  active: 'Active',
  used: 'Used',
  expired: 'Expired',
  operational: 'Operational',
  congested: 'Congested',
  closed: 'Closed',
  idle: 'Idle',
  maintenance: 'Maintenance',
  pending: 'Pending',
  running: 'Running',
  failed: 'Failed',
}

export function StatusBadge({ status, pulse }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'text-slate-400 bg-slate-400/10'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
      colorClass,
      pulse && 'status-pulse'
    )}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}
