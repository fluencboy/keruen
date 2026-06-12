'use client'
import { AppShell } from '@/components/layout/AppShell'
import { LiveFeed } from '@/components/ui/LiveFeed'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, notificationsApi } from '@/lib/api'
import { SEVERITY_COLORS, EVENT_ICONS, formatDateTime } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { showToast } from '@/components/ui/toaster'

export default function FeedPage() {
  const qc = useQueryClient()

  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsApi.feed(100),
    refetchInterval: 15000,
  })
  const events = eventsData?.data || []

  const { data: notifData } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
    refetchInterval: 30000,
  })
  const notifications = notifData?.data || []
  const unread = notifications.filter((n: any) => !n.is_read).length

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-all'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
      showToast('All notifications marked as read', 'success')
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-all'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const NOTIF_ICONS: Record<string, string> = {
    success: '✅',
    error: '🔴',
    warning: '⚠️',
    info: 'ℹ️',
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Live Operations Feed</h1>
            <p className="text-slate-400 text-sm mt-0.5">Real-time event stream and notifications</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
            <span className="text-xs text-green-400 font-medium">WebSocket Active</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Live WebSocket Feed */}
          <div className="col-span-6 kt-card" style={{ height: '600px' }}>
            <LiveFeed maxItems={50} />
          </div>

          {/* Notifications Panel */}
          <div className="col-span-6 kt-card flex flex-col" style={{ height: '600px' }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">Notifications</span>
                {unread > 0 && (
                  <span className="bg-kt-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors cursor-pointer ${!notif.is_read ? 'bg-slate-800/30' : ''}`}
                    onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{NOTIF_ICONS[notif.type] || 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold ${
                          notif.type === 'success' ? 'text-green-400' :
                          notif.type === 'error' ? 'text-red-400' :
                          notif.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                          {notif.title}
                        </span>
                        {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-kt-blue flex-shrink-0 mt-1" />}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{formatDateTime(notif.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Full event list */}
        <div className="kt-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="font-display font-semibold text-white text-sm">Recent Events Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Event', 'Type', 'Severity', 'Checkpoint', 'Order', 'Time'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left kt-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((event: any) => (
                  <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span>{EVENT_ICONS[event.event_type] || '📌'}</span>
                        <span className="text-slate-300 text-xs">{event.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-slate-400">{event.event_type}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${SEVERITY_COLORS[event.severity] || 'text-slate-400'}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{event.checkpoint_id || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {event.order_id && <span className="text-kt-blue font-mono">#{event.order_id}</span>}
                      {!event.order_id && <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{formatDateTime(event.created_at)}</td>
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
