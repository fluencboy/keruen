'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { simulationsApi } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { showToast } from '@/components/ui/toaster'
import { formatDateTime } from '@/lib/utils'

const SCENARIO_ICONS: Record<string, string> = {
  caspian_storm: '🌊',
  border_closure: '🚧',
  traffic_surge: '📈',
  maintenance: '🔧',
}

const SCENARIO_COLORS: Record<string, string> = {
  caspian_storm: 'border-blue-500/30 hover:border-blue-400/50',
  border_closure: 'border-red-500/30 hover:border-red-400/50',
  traffic_surge: 'border-amber-500/30 hover:border-amber-400/50',
  maintenance: 'border-orange-500/30 hover:border-orange-400/50',
}

export default function SimulationPage() {
  const [selectedScenario, setSelectedScenario] = useState<any>(null)
  const [simName, setSimName] = useState('')
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const qc = useQueryClient()

  const { data: scenariosData } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => simulationsApi.scenarios(),
  })
  const scenarios = scenariosData?.data || []

  const { data: simulationsData, isLoading } = useQuery({
    queryKey: ['simulations'],
    queryFn: () => simulationsApi.list(),
    refetchInterval: 10000,
  })
  const simulations = simulationsData?.data || []

  const runMutation = useMutation({
    mutationFn: (data: any) => simulationsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['simulations'] })
      showToast(`Simulation "${res.data.name}" started`, 'info')
      setSelectedScenario(null)
      setSimName('')
    },
    onError: (err: any) => showToast(err.response?.data?.detail || 'Simulation failed to start', 'error'),
  })

  const handleRun = () => {
    if (!selectedScenario || !simName.trim()) {
      showToast('Please select a scenario and provide a name', 'warning')
      return
    }
    runMutation.mutate({ name: simName, scenario: selectedScenario.key, parameters: {} })
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Event-Driven Simulation</h1>
          <p className="text-slate-400 text-sm mt-0.5">Model scenarios and predict their impact on transit operations</p>
        </div>

        {/* Scenario Selector */}
        <div className="kt-card p-4">
          <h2 className="font-display font-semibold text-white text-sm mb-3">Select Scenario</h2>
          <div className="grid grid-cols-2 gap-3">
            {scenarios.map((scenario: any) => (
              <button
                key={scenario.key}
                onClick={() => setSelectedScenario(scenario)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedScenario?.key === scenario.key
                    ? 'bg-slate-700/60 border-kt-blue/50'
                    : `bg-slate-800/60 ${SCENARIO_COLORS[scenario.key] || 'border-slate-700/50'}`
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{SCENARIO_ICONS[scenario.key] || '⚡'}</span>
                  <span className="font-semibold text-white text-sm">{scenario.name}</span>
                  {selectedScenario?.key === scenario.key && (
                    <span className="ml-auto text-kt-blue">✓</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{scenario.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span>⏱ {scenario.duration_hours}h</span>
                  <span>📍 {scenario.affected?.join(', ')}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedScenario && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-3">
              <input
                value={simName}
                onChange={e => setSimName(e.target.value)}
                placeholder={`e.g. "Q1 ${selectedScenario.name} Impact Analysis"`}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kt-blue"
              />
              <button
                onClick={handleRun}
                disabled={runMutation.isPending || !simName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-kt-blue to-kt-teal text-white font-semibold text-sm rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-50"
              >
                {runMutation.isPending ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                Run Simulation
              </button>
            </div>
          )}
        </div>

        {/* Simulation History */}
        <div className="kt-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="font-display font-semibold text-white text-sm">Simulation History</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading simulations...</div>
          ) : simulations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No simulations run yet</div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {simulations.map((sim: any) => (
                <div
                  key={sim.id}
                  className="flex items-start gap-4 px-4 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedResult(selectedResult?.id === sim.id ? null : sim)}
                >
                  <span className="text-2xl mt-0.5">{SCENARIO_ICONS[sim.scenario] || '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-white text-sm">{sim.name}</span>
                      <StatusBadge status={sim.status} pulse={sim.status === 'running'} />
                    </div>
                    <div className="text-xs text-slate-400">{sim.scenario.replace(/_/g, ' ')} · {formatDateTime(sim.created_at)}</div>
                    {sim.impact_summary && (
                      <div className="text-xs text-slate-300 mt-1 line-clamp-2">{sim.impact_summary}</div>
                    )}
                  </div>
                  <div className="text-slate-500">
                    <svg className={`w-4 h-4 transition-transform ${selectedResult?.id === sim.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result Detail */}
        {selectedResult?.results && (
          <div className="kt-card p-4">
            <h2 className="font-display font-semibold text-white text-sm mb-3">
              Simulation Results: {selectedResult.name}
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-display font-bold text-amber-400">
                  {selectedResult.results.avg_delay_increase_pct?.toFixed(1)}%
                </div>
                <div className="kt-label mt-1">Avg Delay Increase</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-display font-bold text-red-400">
                  {selectedResult.results.total_delayed_orders}
                </div>
                <div className="kt-label mt-1">Affected Orders</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-display font-bold text-blue-400">
                  {selectedResult.results.affected_checkpoints?.length || 0}
                </div>
                <div className="kt-label mt-1">Checkpoints Impacted</div>
              </div>
            </div>

            {selectedResult.results.affected_checkpoints?.length > 0 && (
              <div>
                <div className="kt-label mb-2">Checkpoint Impact</div>
                <div className="space-y-2">
                  {selectedResult.results.affected_checkpoints.map((cp: any) => (
                    <div key={cp.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${cp.new_status === 'closed' ? 'bg-red-500' : cp.new_status === 'congested' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <div className="flex-1">
                        <div className="text-sm text-white">{cp.name}</div>
                        <div className="text-xs text-slate-400">
                          Status: <span className="text-slate-300 capitalize">{cp.old_status}</span> → <span className={cp.new_status === 'closed' ? 'text-red-400' : 'text-amber-400'}>{cp.new_status}</span>
                        </div>
                      </div>
                      {cp.delay_increase_pct !== undefined && (
                        <div className="text-right">
                          <div className="text-xs text-amber-400 font-mono">+{cp.delay_increase_pct.toFixed(0)}%</div>
                          <div className="text-[10px] text-slate-500">delay</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
