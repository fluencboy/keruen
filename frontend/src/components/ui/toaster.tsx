'use client'
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const ToastContext = createContext<{ toast: (msg: string, type?: Toast['type']) => void } | null>(null)

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { message, type } = e.detail
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, message, type: type || 'info' }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    window.addEventListener('kt-toast' as any, handler)
    return () => window.removeEventListener('kt-toast' as any, handler)
  }, [])

  const colorMap = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  }

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`border rounded-lg px-4 py-2.5 text-sm font-medium shadow-xl animate-slide-in backdrop-blur-sm ${colorMap[t.type]}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kt-toast', { detail: { message, type } }))
  }
}
