'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/toaster'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        retryDelay: 2000,
      }
    }
  }))

  // Keep backend awake — ping every 9 minutes (Render sleeps after 15 min)
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/health`).catch(() => {})
    ping()
    const id = setInterval(ping, 9 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
