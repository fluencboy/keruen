'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@keruen.kz', password: 'admin123', color: 'text-purple-400' },
  { role: 'Operator', email: 'operator@keruen.kz', password: 'operator123', color: 'text-blue-400' },
  { role: 'Analyst', email: 'analyst@keruen.kz', password: 'analyst123', color: 'text-teal-400' },
  { role: 'Shipper', email: 'shipper@keruen.kz', password: 'shipper123', color: 'text-green-400' },
  { role: 'Driver', email: 'driver@keruen.kz', password: 'driver123', color: 'text-amber-400' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (loading) {
      setLoadingSeconds(0)
      interval = setInterval(() => setLoadingSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [loading])

  const getLoadingMessage = () => {
    if (loadingSeconds < 5) return 'Signing in...'
    if (loadingSeconds < 15) return 'Connecting to server...'
    if (loadingSeconds < 30) return 'Server is warming up...'
    return 'Almost there, please wait...'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.code === 'ECONNABORTED' ? 'Server is starting up, please try again in 30 seconds' : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
    setLoading(true)
    try {
      await login(acc.email, acc.password)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.code === 'ECONNABORTED' ? 'Server is starting up, please try again in 30 seconds' : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-kt-dark flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-kt-blue/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kt-blue to-kt-teal flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Keruen</h1>
          <p className="text-slate-400 mt-1 text-sm">Mangystau Digital Logistics Control Center</p>
        </div>

        {/* Login card */}
        <div className="kt-card p-6 mb-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="kt-label block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-kt-blue focus:ring-1 focus:ring-kt-blue"
                placeholder="operator@keruen.kz"
                required
              />
            </div>
            <div>
              <label className="kt-label block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-kt-blue focus:ring-1 focus:ring-kt-blue"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-kt-blue to-kt-teal hover:from-blue-500 hover:to-cyan-400 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {getLoadingMessage()}
                </span>
              ) : 'Sign In'}
            </button>
            {loading && loadingSeconds >= 5 && (
              <p className="text-xs text-slate-500 text-center">
                First request wakes up the server (~30s on free tier)
              </p>
            )}
          </form>
        </div>

        {/* Quick access */}
        <div className="kt-card p-4">
          <p className="kt-label mb-3">Quick Access — Demo Accounts</p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => quickLogin(acc)}
                disabled={loading}
                className="flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <span className={`font-medium ${acc.color}`}>{acc.role}</span>
                <span className="text-slate-400 font-mono text-xs">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Keruen v1.0 · Mangystau Region, Kazakhstan
        </p>
      </div>
    </div>
  )
}
