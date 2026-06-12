'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, checkpointsApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { KPICard } from '@/components/ui/KPICard'
import { showToast } from '@/components/ui/toaster'
import { formatDateTime, formatWeight, CARGO_TYPE_LABELS } from '@/lib/utils'
import Link from 'next/link'

export default function ShipperPage() {
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({
    company: '',
    cargo_type: 'dry_goods',
    cargo_weight: '',
    origin: '',
    destination: '',
    desired_date: '',
    origin_checkpoint_id: '',
    dest_checkpoint_id: '',
    notes: '',
  })

  const qc = useQueryClient()

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', filterStatus],
    queryFn: () => ordersApi.list({ status: filterStatus || undefined, limit: 100 }),
    refetchInterval: 30000,
  })
  const orders = ordersData?.data || []

  const { data: statsData } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => ordersApi.stats(),
    refetchInterval: 60000,
  })
  const stats = statsData?.data

  const { data: checkpointsData } = useQuery({
    queryKey: ['checkpoints'],
    queryFn: () => checkpointsApi.list(),
  })
  const checkpoints = checkpointsData?.data || []

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      setShowNewOrder(false)
      setForm({ company: '', cargo_type: 'dry_goods', cargo_weight: '', origin: '', destination: '', desired_date: '', origin_checkpoint_id: '', dest_checkpoint_id: '', notes: '' })
      showToast('Order created successfully!', 'success')
    },
    onError: (err: any) => showToast(err.response?.data?.detail || 'Failed to create order', 'error'),
  })

  const handleAIExtract = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await ordersApi.aiExtract(aiPrompt)
      const data = res.data
      setForm(prev => ({
        ...prev,
        cargo_type: data.cargo_type || prev.cargo_type,
        cargo_weight: data.cargo_weight?.toString() || prev.cargo_weight,
        origin: data.origin || prev.origin,
        destination: data.destination || prev.destination,
        desired_date: data.desired_date || prev.desired_date,
        company: data.company || prev.company,
      }))
      // Auto-match checkpoints
      if (data.origin) {
        const cp = checkpoints.find((c: any) => c.name.toLowerCase().includes(data.origin.toLowerCase()) || data.origin.toLowerCase().includes(c.name.toLowerCase()))
        if (cp) setForm(prev => ({ ...prev, origin_checkpoint_id: cp.id.toString() }))
      }
      showToast(`AI extracted order with ${(data.confidence * 100).toFixed(0)}% confidence`, 'success')
    } catch (err: any) {
      showToast('AI extraction failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrderMutation.mutate({
      ...form,
      cargo_weight: parseFloat(form.cargo_weight),
      desired_date: new Date(form.desired_date).toISOString(),
      origin_checkpoint_id: form.origin_checkpoint_id ? parseInt(form.origin_checkpoint_id) : null,
      dest_checkpoint_id: form.dest_checkpoint_id ? parseInt(form.dest_checkpoint_id) : null,
    })
  }

  const STATUSES = ['', 'created', 'approved', 'slot_assigned', 'in_transit', 'checkpoint_processing', 'arrived', 'completed', 'cancelled']

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Shipper Portal</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage cargo shipments and track deliveries</p>
          </div>
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-kt-blue to-kt-teal text-white font-semibold text-sm rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Shipment
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Total Orders" value={stats.total} color="blue" />
            <KPICard label="In Transit" value={stats.by_status?.in_transit || 0} color="amber" />
            <KPICard label="Completed" value={stats.by_status?.completed || 0} color="green" />
            <KPICard label="Avg Delay" value={stats.avg_delay_minutes?.toFixed(0)} unit="min" color={stats.avg_delay_minutes > 60 ? 'red' : 'teal'} />
          </div>
        )}

        {/* New Order Modal */}
        {showNewOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl kt-card p-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-display font-bold text-white">New Cargo Shipment</h2>
                <button onClick={() => setShowNewOrder(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* AI Assistant */}
              <div className="kt-card-inner p-4 mb-5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <span className="text-sm font-semibold text-purple-300">AI Order Assistant</span>
                  <span className="text-xs text-slate-500 ml-auto">Powered by Gemini</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAIExtract()}
                    placeholder="e.g. Need to send 40 tons of wheat from Beineu to Aktau Port tomorrow"
                    className="flex-1 bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleAIExtract}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <div className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kt-label block mb-1">Company</label>
                    <input value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
                      placeholder="Company name" required />
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Cargo Type</label>
                    <select value={form.cargo_type} onChange={e => setForm(p => ({...p, cargo_type: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue">
                      {Object.entries(CARGO_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Weight (tons)</label>
                    <input type="number" value={form.cargo_weight} onChange={e => setForm(p => ({...p, cargo_weight: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
                      placeholder="40" min="1" max="1000" required />
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Desired Date</label>
                    <input type="datetime-local" value={form.desired_date} onChange={e => setForm(p => ({...p, desired_date: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue" required />
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Origin</label>
                    <input value={form.origin} onChange={e => setForm(p => ({...p, origin: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
                      placeholder="Beineu" required />
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Destination</label>
                    <input value={form.destination} onChange={e => setForm(p => ({...p, destination: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
                      placeholder="Aktau Port" required />
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Origin Checkpoint</label>
                    <select value={form.origin_checkpoint_id} onChange={e => setForm(p => ({...p, origin_checkpoint_id: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue">
                      <option value="">Select checkpoint</option>
                      {checkpoints.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kt-label block mb-1">Dest. Checkpoint</label>
                    <select value={form.dest_checkpoint_id} onChange={e => setForm(p => ({...p, dest_checkpoint_id: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue">
                      <option value="">Select checkpoint</option>
                      {checkpoints.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="kt-label block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue resize-none"
                    rows={2} placeholder="Additional instructions..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNewOrder(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={createOrderMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-kt-blue to-kt-teal text-white rounded-lg text-sm font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-50">
                    {createOrderMutation.isPending ? 'Creating...' : 'Create Shipment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-kt-blue/20 text-kt-blue border border-kt-blue/30' : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>
              {s === '' ? 'All Orders' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {s && stats?.by_status?.[s] ? ` (${stats.by_status[s]})` : ''}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="kt-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white text-sm">Shipment History</h2>
            <span className="text-xs text-slate-400">{orders.length} orders</span>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-slate-400 text-sm mb-2">No shipments found</div>
              <button onClick={() => setShowNewOrder(true)} className="text-kt-blue text-sm hover:underline">Create your first shipment</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Order #', 'Company', 'Cargo', 'Weight', 'Route', 'Date', 'Status', 'Delay'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left kt-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/shipper/orders/${order.id}`} className="text-kt-blue hover:underline font-mono text-xs">
                          {order.order_number}
                        </Link>
                        {order.ai_extracted && <span className="ml-1 text-[9px] text-purple-400 bg-purple-400/10 px-1 py-0.5 rounded">AI</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-[120px] truncate">{order.company}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{order.cargo_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{order.cargo_weight}t</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300 text-xs">{order.origin}</div>
                        <div className="text-slate-500 text-xs">→ {order.destination}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(order.desired_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        {order.delay_minutes > 0 ? (
                          <span className="text-amber-400 font-mono text-xs">+{order.delay_minutes}m</span>
                        ) : (
                          <span className="text-green-400 text-xs">On time</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
