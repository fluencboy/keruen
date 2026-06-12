'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slotsApi, checkpointsApi, ordersApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { showToast } from '@/components/ui/toaster'
import { formatDateTime } from '@/lib/utils'

export default function SlotsPage() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [todayDate, setTodayDate] = useState('')

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setTodayDate(today)
    if (!selectedDate) setSelectedDate(today)
  }, [])
  const [bookingSlot, setBookingSlot] = useState<any>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [qrResult, setQrResult] = useState<any>(null)

  const qc = useQueryClient()

  const { data: checkpointsData } = useQuery({
    queryKey: ['checkpoints'],
    queryFn: () => checkpointsApi.list(),
  })
  const checkpoints = checkpointsData?.data || []

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedCheckpoint, selectedDate],
    queryFn: () => slotsApi.getAvailable(selectedCheckpoint!, selectedDate),
    enabled: !!selectedCheckpoint,
    refetchInterval: 30000,
  })
  const availableSlots = slotsData?.data?.slots || []
  const checkpointInfo = slotsData?.data?.checkpoint

  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-booking'],
    queryFn: () => ordersApi.list({ status: 'approved', limit: 50 }),
  })
  const eligibleOrders = ordersData?.data || []

  const bookMutation = useMutation({
    mutationFn: ({ slotId, orderId }: { slotId: number, orderId: number }) =>
      slotsApi.book(slotId, orderId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['available-slots'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setBookingSlot(null)
      setSelectedOrderId('')
      showToast('Slot booked successfully!', 'success')
      // Fetch QR
      if (res.data?.id) {
        slotsApi.getQR(res.data.id).then(qr => setQrResult(qr.data))
      }
    },
    onError: (err: any) => showToast(err.response?.data?.detail || 'Booking failed', 'error'),
  })

  const handleBook = () => {
    if (!bookingSlot || !selectedOrderId) {
      showToast('Please select an order', 'warning')
      return
    }
    bookMutation.mutate({ slotId: bookingSlot.id, orderId: parseInt(selectedOrderId) })
  }

  const slotsByHour = availableSlots.reduce((acc: any, slot: any) => {
    const hour = new Date(slot.slot_time).getHours()
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(slot)
    return acc
  }, {})

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Slot Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Reserve checkpoint time slots for your shipments</p>
        </div>

        {/* Controls */}
        <div className="kt-card p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="kt-label block mb-1.5">Select Checkpoint</label>
              <select
                value={selectedCheckpoint || ''}
                onChange={e => setSelectedCheckpoint(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
              >
                <option value="">Choose a checkpoint...</option>
                {checkpoints.map((cp: any) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name} — {cp.status === 'operational' ? '✅' : cp.status === 'congested' ? '⚠️' : '🔴'} {cp.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="kt-label block mb-1.5">Date</label>
              <input
                type="date"
                value={selectedDate}
                min={todayDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
              />
            </div>
          </div>

          {checkpointInfo && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400">Load: </span>
                <span className="text-white font-medium">{slotsData?.data?.checkpoint?.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Available slots: </span>
                <span className="text-green-400 font-bold">{slotsData?.data?.total_available || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Slots Grid */}
        {selectedCheckpoint && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-4">
              Available Slots — {selectedDate}
            </h2>
            {slotsLoading ? (
              <div className="text-center py-8 text-slate-400">Loading slots...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-2xl mb-2">📅</div>
                <div>No available slots for this date</div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(slotsByHour).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([hour, slots]: any) => (
                  <div key={hour}>
                    <div className="kt-label mb-2">{parseInt(hour).toString().padStart(2, '0')}:00</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot: any) => (
                        <button
                          key={slot.id}
                          onClick={() => setBookingSlot(slot)}
                          className="px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/20 hover:border-green-500/40 transition-all"
                        >
                          {new Date(slot.slot_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          <span className="ml-1.5 text-green-500/60">{slot.duration_minutes}m</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedCheckpoint && (
          <div className="kt-card p-8 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="text-slate-300 font-medium mb-1">Select a Checkpoint</div>
            <div className="text-slate-500 text-sm">Choose a checkpoint above to view available time slots</div>
          </div>
        )}

        {/* Booking Modal */}
        {bookingSlot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md kt-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-white">Confirm Booking</h2>
                <button onClick={() => setBookingSlot(null)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="kt-card-inner p-3 mb-4 border border-green-500/20">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="kt-label">Checkpoint</div>
                    <div className="text-white">{checkpointInfo?.name}</div>
                  </div>
                  <div>
                    <div className="kt-label">Slot Time</div>
                    <div className="text-white">{formatDateTime(bookingSlot.slot_time)}</div>
                  </div>
                  <div>
                    <div className="kt-label">Duration</div>
                    <div className="text-white">{bookingSlot.duration_minutes} minutes</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="kt-label block mb-1.5">Link to Order</label>
                {eligibleOrders.length > 0 ? (
                  <select
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
                    required
                  >
                    <option value="">Select approved order...</option>
                    {eligibleOrders.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.cargo_weight}t {o.cargo_type}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    No approved orders available. Create and approve an order first.
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setBookingSlot(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleBook}
                  disabled={bookMutation.isPending || !selectedOrderId}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg text-sm font-semibold hover:from-green-400 hover:to-teal-400 transition-all disabled:opacity-50"
                >
                  {bookMutation.isPending ? 'Booking...' : 'Book Slot'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Result Modal */}
        {qrResult && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm kt-card p-6 text-center">
              <div className="text-green-400 text-4xl mb-3">✅</div>
              <h2 className="font-display font-bold text-white mb-1">Slot Booked!</h2>
              <p className="text-slate-400 text-sm mb-4">Your digital pass is ready</p>
              <div className="bg-white rounded-xl p-3 inline-block mb-3">
                <img
                  src={`data:image/png;base64,${qrResult.qr_code}`}
                  alt="QR Pass"
                  className="w-40 h-40"
                />
              </div>
              <div className="font-mono text-kt-blue text-lg font-bold mb-4">{qrResult.booking_number}</div>
              <button
                onClick={() => setQrResult(null)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-kt-blue to-kt-teal text-white rounded-lg text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
