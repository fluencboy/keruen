'use client'
import { useEffect, useRef, useState } from 'react'
import { EVENT_ICONS, SEVERITY_COLORS } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

interface LiveEvent {
  id: number
  event_type: string
  title: string
  description?: string
  severity: string
  checkpoint_id?: number
  order_id?: number
  created_at: string
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export function LiveFeed({ maxItems = 50, compact = false }: { maxItems?: number, compact?: boolean }) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [])

  function connect() {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/events`)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        setTimeout(connect, 3000)
      }
      ws.onerror = () => setConnected(false)

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'initial_events' && Array.isArray(msg.data)) {
            setEvents(msg.data.slice(0, maxItems))
          } else if (msg.type !== 'ping' && msg.type !== 'pong' && msg.data) {
            const newEvent: LiveEvent = {
              id: Date.now(),
              event_type: msg.type,
              title: msg.data.title || msg.type.replace(/_/g, ' '),
              description: msg.data.order_number
                ? `Order: ${msg.data.order_number}`
                : msg.data.checkpoint || msg.data.description,
              severity: msg.data.severity || 'info',
              created_at: msg.timestamp || new Date().toISOString(),
            }
            setEvents(prev => [newEvent, ...prev].slice(0, maxItems))
          }
        } catch {}
      }
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 live-dot' : 'bg-red-400'}`} />
          <span className="text-xs font-medium text-slate-300">Live Operations Feed</span>
        </div>
        <span className="text-xs text-slate-500">{events.length} events</span>
      </div>

      {/* Events list */}
      <div ref={feedRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Waiting for events...
          </div>
        ) : (
          events.map((event, i) => (
            <div key={`${event.id}-${i}`} className={`
              ${i === 0 ? 'animate-slide-in' : ''}
              flex gap-3 px-4 py-2.5 border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors
              ${compact ? '' : ''}
            `}>
              <span className="text-base flex-shrink-0 mt-0.5">
                {EVENT_ICONS[event.event_type] || '📌'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${SEVERITY_COLORS[event.severity] || 'text-slate-300'}`}>
                    {event.title}
                  </span>
                </div>
                {event.description && !compact && (
                  <div className="text-xs text-slate-400 truncate">{event.description}</div>
                )}
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {formatDateTime(event.created_at)}
                </div>
              </div>
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                event.severity === 'error' ? 'bg-red-500' :
                event.severity === 'warning' ? 'bg-amber-500' :
                event.severity === 'success' ? 'bg-green-500' : 'bg-blue-500'
              }`} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
