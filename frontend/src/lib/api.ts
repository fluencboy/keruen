import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kt_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 from auth endpoints, not from redirected API calls
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || ''
      if (url.includes('/api/auth/')) {
        localStorage.removeItem('kt_token')
        localStorage.removeItem('kt_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  register: (data: any) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
}

// Dashboard
export const dashboardApi = {
  getKPIs: () => api.get('/api/dashboard/kpis'),
  getCheckpointsMap: () => api.get('/api/dashboard/checkpoints-map'),
  getCorridorHealth: () => api.get('/api/dashboard/corridor-health'),
  getRecentActivity: () => api.get('/api/dashboard/recent-activity'),
  getCargByType: () => api.get('/api/dashboard/cargo-by-type'),
}

// Orders
export const ordersApi = {
  list: (params?: any) => api.get('/api/orders/', { params }),
  get: (id: number) => api.get(`/api/orders/${id}`),
  create: (data: any) => api.post('/api/orders', data),
  update: (id: number, data: any) => api.put(`/api/orders/${id}`, data),
  cancel: (id: number) => api.delete(`/api/orders/${id}`),
  stats: () => api.get('/api/orders/stats'),
  aiExtract: (prompt: string) => api.post('/api/orders/ai/extract', { prompt }),
}

// Slots
export const slotsApi = {
  list: (params?: any) => api.get('/api/slots', { params }),
  getAvailable: (checkpointId: number, date?: string) =>
    api.get('/api/slots/available', { params: { checkpoint_id: checkpointId, date } }),
  book: (slotId: number, orderId: number) =>
    api.post('/api/slots/book', { slot_id: slotId, order_id: orderId }),
  get: (id: number) => api.get(`/api/slots/${id}`),
  getQR: (id: number) => api.get(`/api/slots/${id}/qr`),
}

// Checkpoints
export const checkpointsApi = {
  list: () => api.get('/api/checkpoints'),
  get: (id: number) => api.get(`/api/checkpoints/${id}`),
  getStatus: (id: number) => api.get(`/api/checkpoints/${id}/status`),
  updateStatus: (id: number, status: string) => api.put(`/api/checkpoints/${id}/status`, null, { params: { status } }),
}

// Vehicles
export const vehiclesApi = {
  list: (params?: any) => api.get('/api/vehicles', { params }),
  stats: () => api.get('/api/vehicles/stats'),
  getMap: () => api.get('/api/vehicles/map'),
  get: (id: number) => api.get(`/api/vehicles/${id}`),
}

// Notifications
export const notificationsApi = {
  list: (params?: any) => api.get('/api/notifications', { params }),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id: number) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/mark-all-read'),
}

// Events
export const eventsApi = {
  list: (params?: any) => api.get('/api/events', { params }),
  feed: (limit?: number) => api.get('/api/events/feed', { params: { limit } }),
}

// Predictions
export const predictionsApi = {
  list: (checkpointId?: number) => api.get('/api/predictions/', { params: { checkpoint_id: checkpointId } }),
  refresh: () => api.get('/api/predictions/refresh'),
  forCheckpoint: (id: number, params?: any) => api.get(`/api/predictions/checkpoint/${id}`, { params }),
}

// Analytics
export const analyticsApi = {
  copilot: (question: string) => api.post('/api/analytics/copilot', { question }),
  cargoVolume: (days?: number) => api.get('/api/analytics/cargo-volume', { params: { days } }),
  congestionHeatmap: () => api.get('/api/analytics/congestion-heatmap'),
  throughputTrend: (checkpointId?: number, days?: number) =>
    api.get('/api/analytics/throughput-trend', { params: { checkpoint_id: checkpointId, days } }),
  corridorUtilization: () => api.get('/api/analytics/corridor-utilization'),
  transportMode: () => api.get('/api/analytics/transport-mode'),
  delayDistribution: () => api.get('/api/analytics/delay-distribution'),
  topRoutes: () => api.get('/api/analytics/top-routes'),
}

// Simulations
export const simulationsApi = {
  list: () => api.get('/api/simulations'),
  scenarios: () => api.get('/api/simulations/scenarios'),
  create: (data: any) => api.post('/api/simulations', data),
  get: (id: number) => api.get(`/api/simulations/${id}`),
}
