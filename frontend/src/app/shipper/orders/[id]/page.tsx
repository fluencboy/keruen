'use client'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, slotsApi, checkpointsApi, predictionsApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { showToast } from '@/components/ui/toaster'
import { formatDateTime, CARGO_TYPE_LABELS } from '@/lib/utils'
import Link from 'next/link'

const STATUS_FLOW = ['created', 'approved', 'slot_assigned', 'in_transit', 'checkpoint_processing', 'arrived', 'completed']

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = parseInt(params.id as string)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  })
  const order = data?.data

  const { data: cpData } = useQuery({
    queryKey: ['checkpoints'],
    queryFn: () => checkpointsApi.list(),
  })
  const checkpoints = cpData?.data || []

  const updateMutation = useMutation({
    mutationFn: (update: any) => ordersApi.update(orderId, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      showToast('Order updated', 'success')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      showToast('Order cancelled', 'info')
    },
  })

  if (isLoading) {
    return <AppShell><div className="p-6 text-slate-400">Loading...</div></AppShell>
  }
  if (!order) {
    return <AppShell><div className="p-6 text-slate-400">Order not found</div></AppShell>
  }

  const currentStep = STATUS_FLOW.indexOf(order.status)
  const originCp = checkpoints.find((c: any) => c.id === order.origin_checkpoint_id)
  const destCp = checkpoints.find((c: any) => c.id === order.dest_checkpoint_id)

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/shipper" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold text-white font-mono">{order.order_number}</h1>
              <p className="text-slate-400 text-sm">{order.company}</p>
            </div>
            {order.ai_extracted && (
              <span className="px-2 py-0.5 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md">AI Extracted</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} pulse={['in_transit', 'checkpoint_processing'].includes(order.status)} />
            {order.status === 'created' && (
              <button onClick={() => cancelMutation.mutate()}
                className="px-3 py-1.5 text-xs border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Progress tracker */}
        <div className="kt-card p-5">
          <div className="flex items-center">
            {STATUS_FLOW.map((status, i) => {
              const isCompleted = i < currentStep || order.status === 'completed'
              const isCurrent = i === currentStep
              const isPending = i > currentStep
              return (
                <div key={status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      isCurrent ? 'bg-kt-blue/20 border-kt-blue text-kt-blue' :
                      'bg-slate-800 border-slate-600 text-slate-500'
                    }`}>
                      {isCompleted ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] text-center w-16 ${isCurrent ? 'text-kt-blue font-medium' : isPending ? 'text-slate-500' : 'text-slate-400'}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-green-500' : 'bg-slate-700'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Cargo Details</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cargo Type', value: CARGO_TYPE_LABELS[order.cargo_type] || order.cargo_type },
                { label: 'Weight', value: `${order.cargo_weight} tons` },
                { label: 'Origin', value: order.origin },
                { label: 'Destination', value: order.destination },
                { label: 'Origin Checkpoint', value: originCp?.name || 'Not assigned' },
                { label: 'Dest. Checkpoint', value: destCp?.name || 'Not assigned' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-lg p-2.5">
                  <div className="kt-label">{item.label}</div>
                  <div className="text-sm text-white mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Timeline</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Created', value: formatDateTime(order.created_at), icon: '📋' },
                { label: 'Desired Arrival', value: formatDateTime(order.desired_date), icon: '🎯' },
                { label: 'Estimated Arrival', value: order.estimated_arrival ? formatDateTime(order.estimated_arrival) : 'Pending', icon: '⏱️' },
                { label: 'Actual Arrival', value: order.actual_arrival ? formatDateTime(order.actual_arrival) : 'Pending', icon: '✅' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <div className="kt-label">{item.label}</div>
                    <div className="text-sm text-slate-300">{item.value}</div>
                  </div>
                </div>
              ))}
              {order.delay_minutes > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
                  <div className="text-xs font-medium text-amber-400">⚠ Delay: {order.delay_minutes} minutes</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slot info */}
        {order.slot_id && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Slot Reservation</h2>
            <SlotInfo slotId={order.slot_id} />
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-2">Notes</h2>
            <p className="text-slate-300 text-sm">{order.notes}</p>
          </div>
        )}

        {/* Status update for operators */}
        <div className="kt-card p-4">
          <h2 className="font-display font-semibold text-white text-sm mb-3">Update Status</h2>
          <div className="flex gap-2 flex-wrap">
            {['approved', 'in_transit', 'checkpoint_processing', 'arrived', 'completed'].map(s => (
              <button key={s}
                onClick={() => updateMutation.mutate({ status: s })}
                disabled={updateMutation.isPending || order.status === s}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-40 ${
                  order.status === s
                    ? 'bg-kt-blue/20 border-kt-blue/30 text-kt-blue'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}>
                → {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function SlotInfo({ slotId }: { slotId: number }) {
  const { data } = useQuery({
    queryKey: ['slot', slotId],
    queryFn: () => slotsApi.get(slotId),
  })
  const { data: qrData } = useQuery({
    queryKey: ['slot-qr', slotId],
    queryFn: () => slotsApi.getQR(slotId),
    enabled: !!data?.data?.booking_number,
  })

  const slot = data?.data
  if (!slot) return <div className="text-slate-400 text-sm">Loading slot...</div>

  return (
    <div className="flex gap-4">
      <div className="flex-1 grid grid-cols-3 gap-3">
        {[
          { label: 'Booking Number', value: slot.booking_number || 'N/A' },
          { label: 'Slot Time', value: formatDateTime(slot.slot_time) },
          { label: 'Status', value: slot.status },
          { label: 'Duration', value: `${slot.duration_minutes} min` },
          { label: 'Vehicle Type', value: slot.vehicle_type || 'Any' },
        ].map(item => (
          <div key={item.label} className="bg-slate-800/60 rounded-lg p-2.5">
            <div className="kt-label">{item.label}</div>
            <div className="text-sm text-white mt-0.5 font-mono">{item.value}</div>
          </div>
        ))}
      </div>
      {qrData?.data?.qr_code && (
        <div className="flex-shrink-0 text-center">
          <div className="kt-label mb-2">Digital Pass</div>
          <img
            src={`data:image/png;base64,${qrData.data.qr_code}`}
            alt="QR Code"
            className="w-24 h-24 rounded-lg border border-slate-600"
          />
        </div>
      )}
    </div>
  )
}
