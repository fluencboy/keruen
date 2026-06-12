import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-KZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatWeight(tons: number) {
  if (tons >= 1000) return `${(tons / 1000).toFixed(1)}kt`
  return `${tons.toFixed(0)}t`
}

export const STATUS_COLORS: Record<string, string> = {
  created: 'text-blue-400 bg-blue-400/10',
  approved: 'text-cyan-400 bg-cyan-400/10',
  slot_assigned: 'text-purple-400 bg-purple-400/10',
  in_transit: 'text-amber-400 bg-amber-400/10',
  checkpoint_processing: 'text-orange-400 bg-orange-400/10',
  arrived: 'text-teal-400 bg-teal-400/10',
  completed: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

export const CHECKPOINT_STATUS_COLOR: Record<string, string> = {
  operational: '#10B981',
  congested: '#F59E0B',
  closed: '#EF4444',
}

export const CARGO_TYPE_LABELS: Record<string, string> = {
  crude_oil: 'Crude Oil',
  dry_goods: 'Dry Goods',
  chemicals: 'Chemicals',
  grain: 'Grain',
  machinery: 'Machinery',
  containers: 'Containers',
  steel: 'Steel',
  fertilizer: 'Fertilizer',
  consumer_goods: 'Consumer Goods',
  coal: 'Coal',
}

export const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
}

export const EVENT_ICONS: Record<string, string> = {
  shipment_created: '📦',
  slot_booked: '🎫',
  congestion_increased: '⚠️',
  checkpoint_reopened: '✅',
  shipment_completed: '🏁',
  delay_detected: '⏱️',
  vehicle_arrived: '🚛',
  inspection_required: '🔍',
  simulation_completed: '🧪',
  status_change: '🔄',
}
