'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, predictionsApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { CorridorHealthScore } from '@/components/ui/CorridorHealth'
import { CheckpointMap } from '@/components/maps/CheckpointMap'
import { LiveFeed } from '@/components/ui/LiveFeed'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

const COLORS = ['#0EA5E9', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

export default function DashboardPage() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleString('en-KZ', { timeZone: 'Asia/Aqtau' }))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  const { data: kpisData, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardApi.getKPIs(),
    refetchInterval: 15000,
  })
  const kpis = kpisData?.data

  const { data: mapData } = useQuery({
    queryKey: ['checkpoints-map'],
    queryFn: () => dashboardApi.getCheckpointsMap(),
    refetchInterval: 30000,
  })
  const checkpoints = mapData?.data || []

  const { data: healthData } = useQuery({
    queryKey: ['corridor-health'],
    queryFn: () => dashboardApi.getCorridorHealth(),
    refetchInterval: 30000,
  })
  const health = healthData?.data

  const { data: activityData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => dashboardApi.getRecentActivity(),
    refetchInterval: 60000,
  })
  const activity = activityData?.data || []

  const { data: cargoTypeData } = useQuery({
    queryKey: ['cargo-by-type'],
    queryFn: () => dashboardApi.getCargByType(),
    refetchInterval: 60000,
  })
  const cargoTypes = cargoTypeData?.data || []

  const { data: predsData } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => predictionsApi.list(),
    refetchInterval: 30000,
  })
  const predictions = predsData?.data || []

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Akimat Command Center</h1>
            <p className="text-slate-400 text-sm mt-0.5">Mangystau Region Digital Logistics Control</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <span className="text-xs text-green-400 font-medium">Live</span>
            </div>
            {currentTime && (
              <div className="text-xs text-slate-500 font-mono">
                {currentTime} (Aqtau)
              </div>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="Active Shipments"
            value={kpis?.active_shipments ?? 0}
            color="blue"
            loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />
          <KPICard
            label="Active Vehicles"
            value={kpis?.active_vehicles ?? 0}
            color="teal"
            loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          />
          <KPICard
            label="Cargo Volume (24h)"
            value={kpis ? Math.round(kpis.total_cargo_volume) : 0}
            unit="tons"
            color="green"
            loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
          />
          <KPICard
            label="Avg Wait Time"
            value={kpis ? kpis.avg_waiting_time.toFixed(0) : 0}
            unit="min"
            color={kpis?.avg_waiting_time > 60 ? 'red' : kpis?.avg_waiting_time > 30 ? 'amber' : 'green'}
            loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Completed Today" value={kpis?.completed_today ?? 0} color="green" loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KPICard label="Pending Approval" value={kpis?.pending_approval ?? 0} color="amber" loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KPICard label="Congested Checkpoints" value={kpis?.congested_checkpoints ?? 0}
            color={kpis?.congested_checkpoints > 2 ? 'red' : kpis?.congested_checkpoints > 0 ? 'amber' : 'green'}
            loading={kpisLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          {health && (
            <div className="kt-card border border-green-500/20 p-4">
              <div className="kt-label mb-1">Health Score</div>
              <div className={`text-3xl font-display font-bold ${health.score >= 80 ? 'text-green-400' : health.score >= 60 ? 'text-kt-blue' : health.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {health.score.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400 mt-1">{health.label} · {health.trend === 'up' ? '↑ Improving' : health.trend === 'down' ? '↓ Declining' : '→ Stable'}</div>
            </div>
          )}
        </div>

        {/* Map + Health + Live Feed */}
        <div className="grid grid-cols-12 gap-4">
          {/* Map */}
          <div className="col-span-7 kt-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-white text-sm">Regional Infrastructure Map</h2>
              <div className="flex items-center gap-3 text-xs">
                {['operational', 'congested', 'closed'].map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${s === 'operational' ? 'bg-green-400' : s === 'congested' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span className="text-slate-400 capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <CheckpointMap
              checkpoints={checkpoints}
              height="340px"
              onCheckpointClick={setSelectedCheckpoint}
            />
          </div>

          {/* Right column */}
          <div className="col-span-5 flex flex-col gap-4">
            {/* Corridor Health */}
            {health && (
              <CorridorHealthScore
                score={health.score}
                label={health.label}
                trend={health.trend}
                details={{
                  avg_delay: health.avg_delay,
                  congestion_index: health.congestion_index,
                  active_incidents: health.active_incidents,
                  throughput_24h: health.throughput_24h,
                }}
              />
            )}

            {/* Checkpoint Status Cards */}
            <div className="kt-card p-3">
              <div className="kt-label mb-2">Checkpoint Status</div>
              <div className="space-y-1.5">
                {checkpoints.map((cp: any) => (
                  <div key={cp.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 cursor-pointer transition-colors"
                    onClick={() => setSelectedCheckpoint(cp)}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cp.status === 'operational' ? 'bg-green-400' : cp.status === 'congested' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{cp.name}</div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{cp.current_load}/{cp.capacity}</div>
                    <div className="text-xs text-slate-400">{cp.avg_wait_minutes.toFixed(0)}m</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Activity chart */}
          <div className="col-span-5 kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">24h Activity</h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={h => `${h}:00`} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Area type="monotone" dataKey="created" stroke="#0EA5E9" fill="url(#colorCreated)" name="Created" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="#10B981" fill="url(#colorCompleted)" name="Completed" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cargo type pie */}
          <div className="col-span-3 kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Cargo Types</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={cargoTypes.slice(0, 6)} dataKey="count" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {cargoTypes.slice(0, 6).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {cargoTypes.slice(0, 4).map((ct: any, i: number) => (
                <div key={ct.type} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-400 capitalize flex-1 truncate">{ct.type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300 font-mono">{ct.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ML Predictions */}
          <div className="col-span-4 kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">ML Predictions</h2>
            <div className="space-y-2">
              {checkpoints.map((cp: any) => {
                const pred = predictions.find((p: any) => p.checkpoint_id === cp.id)
                const risk = pred?.risk_score || 0
                return (
                  <div key={cp.id} className="flex items-center gap-2">
                    <div className="text-xs text-slate-400 w-20 truncate">{cp.code}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${risk > 70 ? 'bg-red-500' : risk > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, risk)}%` }}
                      />
                    </div>
                    <div className={`text-xs font-mono w-10 text-right ${risk > 70 ? 'text-red-400' : risk > 40 ? 'text-amber-400' : 'text-green-400'}`}>
                      {risk.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Low risk</span>
              <span>Risk Score (0-100)</span>
              <span>High risk</span>
            </div>
          </div>
        </div>

        {/* Live feed */}
        <div className="kt-card" style={{ height: '280px' }}>
          <LiveFeed maxItems={30} />
        </div>

        {/* Selected checkpoint detail */}
        {selectedCheckpoint && (
          <div className="fixed bottom-6 right-6 w-72 kt-card border border-kt-blue/30 p-4 shadow-2xl z-50">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-white">{selectedCheckpoint.name}</div>
              <button onClick={() => setSelectedCheckpoint(null)} className="text-slate-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Status', value: selectedCheckpoint.status, badge: true },
                { label: 'Utilization', value: `${selectedCheckpoint.utilization_pct.toFixed(0)}%` },
                { label: 'Avg Wait', value: `${selectedCheckpoint.avg_wait_minutes.toFixed(0)} min` },
                { label: 'Vehicles', value: selectedCheckpoint.active_vehicles },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-lg p-2">
                  <div className="kt-label">{item.label}</div>
                  {item.badge ? (
                    <StatusBadge status={selectedCheckpoint.status} />
                  ) : (
                    <div className="text-sm font-medium text-white mt-0.5">{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
