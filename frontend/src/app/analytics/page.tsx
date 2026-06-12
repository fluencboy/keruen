'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, dashboardApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { showToast } from '@/components/ui/toaster'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter
} from 'recharts'

const COLORS = ['#0EA5E9', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B']

export default function AnalyticsPage() {
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState(30)

  const { data: cargoVolData } = useQuery({
    queryKey: ['cargo-volume', selectedDays],
    queryFn: () => analyticsApi.cargoVolume(selectedDays),
    refetchInterval: 60000,
  })
  const cargoVolume = cargoVolData?.data || []

  const { data: throughputData } = useQuery({
    queryKey: ['throughput-trend'],
    queryFn: () => analyticsApi.throughputTrend(undefined, 14),
    refetchInterval: 60000,
  })
  const throughput = throughputData?.data || []

  const { data: utilizationData } = useQuery({
    queryKey: ['corridor-utilization'],
    queryFn: () => analyticsApi.corridorUtilization(),
    refetchInterval: 60000,
  })
  const utilization = utilizationData?.data || []

  const { data: transportModeData } = useQuery({
    queryKey: ['transport-mode'],
    queryFn: () => analyticsApi.transportMode(),
  })
  const transportMode = transportModeData?.data || []

  const { data: delayDistData } = useQuery({
    queryKey: ['delay-distribution'],
    queryFn: () => analyticsApi.delayDistribution(),
  })
  const delayDist = delayDistData?.data || []

  const { data: topRoutesData } = useQuery({
    queryKey: ['top-routes'],
    queryFn: () => analyticsApi.topRoutes(),
  })
  const topRoutes = topRoutesData?.data || []

  const { data: heatmapData } = useQuery({
    queryKey: ['congestion-heatmap'],
    queryFn: () => analyticsApi.congestionHeatmap(),
  })
  const heatmap = heatmapData?.data || []

  const { data: healthData } = useQuery({
    queryKey: ['corridor-health'],
    queryFn: () => dashboardApi.getCorridorHealth(),
    refetchInterval: 30000,
  })
  const health = healthData?.data

  const handleAskCopilot = async () => {
    if (!aiQuestion.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    try {
      const res = await analyticsApi.copilot(aiQuestion)
      setAiAnswer(res.data)
    } catch {
      showToast('Analytics copilot failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const SAMPLE_QUESTIONS = [
    "What is the biggest bottleneck right now?",
    "Which checkpoint has the highest congestion?",
    "What cargo type causes the most delays?",
    "How can we improve corridor efficiency?",
  ]

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Analytics & Intelligence</h1>
            <p className="text-slate-400 text-sm mt-0.5">Regional logistics performance insights</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => setSelectedDays(d)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${selectedDays === d ? 'bg-kt-blue/20 text-kt-blue border border-kt-blue/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* AI Copilot */}
        <div className="kt-card p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <span className="font-semibold text-purple-300 text-sm">Analytics Copilot</span>
            <span className="text-xs text-slate-500 ml-auto">Powered by Gemini AI</span>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskCopilot()}
              placeholder="Ask anything about logistics performance..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleAskCopilot}
              disabled={aiLoading || !aiQuestion.trim()}
              className="px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {aiLoading ? <div className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin" /> : 'Ask'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {SAMPLE_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setAiQuestion(q); }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-md text-xs transition-colors">
                {q}
              </button>
            ))}
          </div>

          {aiAnswer && (
            <div className="bg-slate-800/60 rounded-xl p-4 border border-purple-500/10">
              <div className="text-sm text-slate-200 leading-relaxed mb-3">{aiAnswer.answer}</div>
              {aiAnswer.data_points && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-700/50">
                  {aiAnswer.data_points.map((dp: any) => (
                    <div key={dp.metric} className="bg-slate-700/60 rounded-lg p-2 text-center">
                      <div className="text-lg font-display font-bold text-kt-blue">{dp.value}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{dp.metric}</div>
                      {dp.unit && <div className="text-[10px] text-slate-500">{dp.unit}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Health Score Breakdown */}
        {health && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Corridor Health Breakdown</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Delay Score', value: health.delay_score, color: '#10B981' },
                { label: 'Congestion Score', value: health.congestion_score, color: '#0EA5E9' },
                { label: 'Incident Score', value: health.incident_score, color: '#F59E0B' },
                { label: 'Throughput Score', value: health.throughput_score, color: '#8B5CF6' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-xl p-3">
                  <div className="kt-label mb-2">{item.label}</div>
                  <div className="text-2xl font-display font-bold" style={{ color: item.color }}>{item.value?.toFixed(0)}</div>
                  <div className="mt-2 bg-slate-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cargo Volume */}
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Cargo Volume ({selectedDays}d)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cargoVolume.slice(-30)}>
                <defs>
                  <linearGradient id="cargoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                  formatter={(v: any) => [`${v.toFixed(0)}t`, 'Cargo']}
                />
                <Area type="monotone" dataKey="total_weight" stroke="#0EA5E9" fill="url(#cargoGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Throughput */}
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Throughput & Wait Time (14d)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="vehicles" stroke="#10B981" strokeWidth={2} dot={false} name="Vehicles" />
                <Line yAxisId="right" type="monotone" dataKey="avg_wait" stroke="#F59E0B" strokeWidth={2} dot={false} name="Wait (min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Corridor Utilization */}
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Corridor Utilization</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="utilization_pct" name="Utilization %" radius={[0, 4, 4, 0]}>
                  {utilization.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.utilization_pct > 80 ? '#EF4444' : entry.utilization_pct > 60 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transport Mode */}
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Vehicle Fleet Distribution</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={transportMode} dataKey="count" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {transportMode.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {transportMode.slice(0, 4).map((tm: any, i: number) => (
                <div key={tm.type} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-slate-400 capitalize flex-1">{tm.type}</span>
                  <span className="text-slate-300 font-mono">{tm.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delay Distribution */}
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">Delay Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={delayDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                  {delayDist.map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? '#10B981' : i === 1 ? '#0EA5E9' : i === 2 ? '#F59E0B' : i === 3 ? '#F97316' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Congestion Heatmap */}
        <div className="kt-card p-4">
          <h2 className="font-display font-semibold text-white text-sm mb-3">Congestion Heatmap by Hour</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-medium py-1 pr-4 w-28">Checkpoint</th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th key={i} className="text-center text-slate-500 font-normal w-8">{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row: any) => (
                  <tr key={row.checkpoint_id}>
                    <td className="text-slate-300 py-1 pr-4 font-medium">{row.code}</td>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cell = row.hourly_congestion.find((h: any) => h.hour === hour)
                      const congestion = cell?.congestion || 0
                      const alpha = Math.round(congestion * 255).toString(16).padStart(2, '0')
                      const color = congestion > 0.7 ? `#EF444${alpha}` : congestion > 0.4 ? `#F59E0B${alpha}` : `#10B981${alpha}`
                      return (
                        <td key={hour} className="p-0.5">
                          <div
                            className="w-6 h-5 rounded-sm"
                            style={{ background: congestion > 0 ? color : '#1e293b' }}
                            title={`${row.code} ${hour}:00 — ${(congestion * 100).toFixed(0)}%`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /><span>Low</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span>Medium</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500" /><span>High</span></div>
            </div>
          </div>
        </div>

        {/* Top Routes */}
        <div className="kt-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="font-display font-semibold text-white text-sm">Top Transit Routes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Route', 'Count', 'Avg Weight', 'Avg Delay'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left kt-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topRoutes.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-300">{r.origin}</div>
                      <div className="text-slate-500 text-xs">→ {r.destination}</div>
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{r.count}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{r.avg_weight}t</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${r.avg_delay > 60 ? 'text-red-400' : r.avg_delay > 30 ? 'text-amber-400' : 'text-green-400'}`}>
                        {r.avg_delay.toFixed(0)}m
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
