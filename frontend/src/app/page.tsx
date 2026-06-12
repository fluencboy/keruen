'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const roleRoutes: Record<string, string> = {
          admin: '/dashboard',
          operator: '/dashboard',
          analyst: '/analytics',
          shipper: '/shipper',
          driver: '/driver',
        }
        router.replace(roleRoutes[user.role] || '/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-kt-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-kt-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-display">Loading Keruen...</p>
      </div>
    </div>
  )
}
