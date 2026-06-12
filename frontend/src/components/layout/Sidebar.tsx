'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'

const NAV_ITEMS = [
  {
    label: 'Command Center',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    roles: ['admin', 'operator'],
  },
  {
    label: 'Shipper Portal',
    href: '/shipper',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    roles: ['shipper', 'admin', 'operator'],
  },
  {
    label: 'Driver Dashboard',
    href: '/driver',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    roles: ['driver', 'admin', 'operator'],
  },
  {
    label: 'Slot Management',
    href: '/slots',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    roles: ['admin', 'operator', 'driver', 'shipper'],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    roles: ['admin', 'operator', 'analyst'],
  },
  {
    label: 'Simulation',
    href: '/simulation',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    roles: ['admin', 'operator', 'analyst'],
  },
  {
    label: 'Live Feed',
    href: '/feed',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    roles: ['admin', 'operator', 'analyst', 'shipper', 'driver'],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  })
  const unreadCount = unreadData?.data?.count || 0

  const visibleNavItems = NAV_ITEMS.filter(item =>
    !user || item.roles.includes(user.role)
  )

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen bg-slate-900/80 border-r border-slate-700/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kt-blue to-kt-teal flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm">Keruen</div>
            <div className="text-[10px] text-slate-400">Mangystau Region</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-kt-blue/15 text-kt-blue border border-kt-blue/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className={isActive ? 'text-kt-blue' : ''}>{item.icon}</span>
              <span>{item.label}</span>
              {item.href === '/feed' && unreadCount > 0 && (
                <span className="ml-auto bg-kt-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Live indicator */}
      <div className="px-4 py-2 border-t border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
          <span className="text-[11px] text-slate-400">Live Data Active</span>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-800/60">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-kt-blue to-kt-teal flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
