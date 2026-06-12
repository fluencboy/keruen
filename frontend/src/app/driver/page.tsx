'use client'
import { useQuery } from '@tanstack/react-query'
import { ordersApi, slotsApi, checkpointsApi, predictionsApi, vehiclesApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CorridorHealthScore } from '@/components/ui/CorridorHealth'
import { formatDateTime, CARGO_TYPE_LABELS } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function DriverPage() {
  const { user } = useAuth()
  const [selectedSlot, setSelectedSlot] = useState<any>(null)

  // Driver's active orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['driver-orders'],
    queryFn: () => ordersApi.list({ limit: 20 }),
    refetchInterval: 30000,
  })
  const orders = ordersData?.data || []

  // Active/assigned orders
  const activeOrders = orders.filter((o: any) =>
    ['slot_assigned', 'in_transit', 'checkpoint_processing', 'arrived'].includes(o.status)
  )

  // Driver's vehicles
  const { data: vehiclesData } = useQuery({
    queryKey: ['driver-vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 10 }),
    refetchInterval: 60000,
  })
  const vehicles = vehiclesData?.data || []

  const { data: checkpointsData } = useQuery({
    queryKey: ['checkpoints'],
    queryFn: () => checkpointsApi.list(),
  })
  const checkpoints = checkpointsData?.data || []

  const { data: predsData } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => predictionsApi.list(),
    refetchInterval: 30000,
  })
  const predictions = predsData?.data || []

  // Get QR for most recent active order's slot
  const primaryOrder = activeOrders[0]
  const { data: qrData } = useQuery({
    queryKey: ['slot-qr', primaryOrder?.slot_id],
    queryFn: () => slotsApi.getQR(primaryOrder.slot_id),
    enabled: !!primaryOrder?.slot_id,
  })

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Driver Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Welcome back, {user?.full_name}</p>
          </div>
          <Link href="/slots"
            className="flex items-center gap-2 px-4 py-2 bg-kt-blue/10 border border-kt-blue/20 text-kt-blue rounded-lg text-sm font-medium hover:bg-kt-blue/20 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Book a Slot
          </Link>
        </div>

        {/* Active Assignment Banner */}
        {primaryOrder ? (
          <div className="kt-gradient-border">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-kt-blue/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-kt-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-white">Active Assignment</span>
                    <StatusBadge status={primaryOrder.status} pulse />
                  </div>
                  <div className="text-sm text-slate-300">
                    <span className="font-mono text-kt-blue">{primaryOrder.order_number}</span>
                    {' · '}
                    {primaryOrder.cargo_weight}t {primaryOrder.cargo_type.replace(/_/g, ' ')}
                    {' · '}
                    {primaryOrder.origin} → {primaryOrder.destination}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Due: {formatDateTime(primaryOrder.desired_date)}</span>
                    {primaryOrder.delay_minutes > 0 && (
                      <span className="text-amber-400">⚠ +{primaryOrder.delay_minutes}m delay</span>
                    )}
                  </div>
                </div>
                <Link href={`/shipper/orders/${primaryOrder.id}`}
                  className="px-3 py-1.5 bg-kt-blue/20 text-kt-blue text-xs rounded-lg hover:bg-kt-blue/30 transition-colors">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="kt-card p-4 border border-slate-700/50">
            <div className="text-center text-slate-400 py-4">
              <div className="text-2xl mb-2">🚛</div>
              <div className="text-sm">No active assignments</div>
              <Link href="/slots" className="text-kt-blue text-sm hover:underline mt-1 inline-block">Book a slot to get started</Link>
            </div>
          </div>
        )}

        {/* QR Pass + Checkpoints */}
        <div className="grid grid-cols-12 gap-4">
          {/* QR Pass */}
          <div className="col-span-4 kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Digital Pass</h2>
            {qrData?.data?.qr_code ? (
              <div className="text-center">
                <img
                  src={`data:image/png;base64,${qrData.data.qr_code}`}
                  alt="QR Pass"
                  className="w-40 h-40 rounded-xl border border-slate-600 mx-auto"
                />
                <div className="mt-3 font-mono text-kt-blue text-sm font-bold">{qrData.data.booking_number}</div>
                <div className="text-xs text-slate-400 mt-1">Show at checkpoint</div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16m0 3.5V20" />
                  </svg>
                </div>
                <div className="text-xs text-slate-500">No active pass</div>
                <Link href="/slots" className="text-kt-blue text-xs hover:underline mt-1 inline-block">Book a slot</Link>
              </div>
            )}
          </div>

          {/* Checkpoint Predictions */}
          <div className="col-span-8 kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Checkpoint Status & Wait Times</h2>
            <div className="space-y-3">
              {checkpoints.map((cp: any) => {
                const pred = predictions.find((p: any) => p.checkpoint_id === cp.id)
                const waitMin = pred?.predicted_wait_minutes || cp.avg_wait_minutes
                const congestion = pred?.predicted_congestion || 0
                const statusColor = cp.status === 'operational' ? 'text-green-400' : cp.status === 'congested' ? 'text-amber-400' : 'text-red-400'

                return (
                  <div key={cp.id} className="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-lg">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cp.status === 'operational' ? 'bg-green-400' : cp.status === 'congested' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white truncate">{cp.name}</span>
                        <span className={`text-xs font-medium ${statusColor} capitalize ml-2`}>{cp.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${congestion > 0.7 ? 'bg-red-500' : congestion > 0.4 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, congestion * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-14 flex-shrink-0">~{waitMin.toFixed(0)}m wait</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-slate-400">{cp.current_load}/{cp.capacity}</div>
                      {pred && <div className="text-[10px] text-purple-400">ML: {pred.risk_score.toFixed(0)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Vehicles */}
        {vehicles.length > 0 && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">My Vehicles</h2>
            <div className="grid grid-cols-3 gap-3">
              {vehicles.slice(0, 6).map((v: any) => (
                <div key={v.id} className="bg-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-white">{v.plate_number}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="text-xs text-slate-400 capitalize">{v.vehicle_type} · {v.capacity_tons}t</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="kt-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="font-display font-semibold text-white text-sm">My Orders</h2>
          </div>
          <div className="divide-y divide-slate-700/30">
            {orders.slice(0, 10).map((order: any) => (
              <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/shipper/orders/${order.id}`} className="font-mono text-xs text-kt-blue hover:underline">{order.order_number}</Link>
                    <span className="text-xs text-slate-500">{order.cargo_weight}t {order.cargo_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xs text-slate-400">{order.origin} → {order.destination}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
