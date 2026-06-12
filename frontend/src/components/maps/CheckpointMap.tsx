'use client'
import { useEffect, useRef } from 'react'

interface CheckpointMapData {
  id: number
  name: string
  code: string
  latitude: number
  longitude: number
  status: string
  current_load: number
  capacity: number
  utilization_pct: number
  avg_wait_minutes: number
  active_vehicles: number
  risk_score?: number
}

interface CheckpointMapProps {
  checkpoints: CheckpointMapData[]
  height?: string
  onCheckpointClick?: (cp: CheckpointMapData) => void
}

const STATUS_COLORS_HEX: Record<string, string> = {
  operational: '#10B981',
  congested: '#F59E0B',
  closed: '#EF4444',
}

export function CheckpointMap({ checkpoints, height = '400px', onCheckpointClick }: CheckpointMapProps) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapRef.current) return

    const L = (window as any).L
    if (!L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => initMap()
      document.head.appendChild(script)
    } else {
      initMap()
    }

    function initMap() {
      const L = (window as any).L
      if (!containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: [43.8, 53.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map)

      mapRef.current = map
      addMarkers(map, L)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = []
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !checkpoints.length) return
    const L = (window as any).L
    if (!L) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    addMarkers(mapRef.current, L)
  }, [checkpoints])

  function addMarkers(map: any, L: any) {
    checkpoints.forEach(cp => {
      const color = STATUS_COLORS_HEX[cp.status] || '#94a3b8'
      const utilPct = cp.utilization_pct || 0

      const svg = `
        <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${cp.id}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M20 0C9 0 0 9 0 20C0 32 20 48 20 48C20 48 40 32 40 20C40 9 31 0 20 0Z"
            fill="${color}" filter="url(#shadow-${cp.id})"/>
          <circle cx="20" cy="20" r="12" fill="#0F172A" opacity="0.9"/>
          <text x="20" y="24" text-anchor="middle" fill="white" font-size="8" font-family="monospace" font-weight="bold">
            ${cp.code}
          </text>
          <circle cx="20" cy="20" r="9" fill="none" stroke="${color}" stroke-width="1.5"
            stroke-dasharray="${2 * Math.PI * 9}" stroke-dashoffset="${2 * Math.PI * 9 * (1 - utilPct / 100)}"
            transform="rotate(-90 20 20)" opacity="0.7"/>
        </svg>
      `

      const icon = L.divIcon({
        html: svg,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
        className: '',
      })

      const marker = L.marker([cp.latitude, cp.longitude], { icon })

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${color}">${cp.name}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
            <div>
              <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em">Status</div>
              <div style="color: ${color}; font-weight: 600; text-transform: capitalize">${cp.status}</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em">Load</div>
              <div style="color: #f1f5f9; font-weight: 600">${cp.current_load}/${cp.capacity}</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em">Avg Wait</div>
              <div style="color: #f1f5f9; font-weight: 600">${cp.avg_wait_minutes.toFixed(0)} min</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em">Vehicles</div>
              <div style="color: #f1f5f9; font-weight: 600">${cp.active_vehicles}</div>
            </div>
          </div>
        </div>
      `)

      if (onCheckpointClick) {
        marker.on('click', () => onCheckpointClick(cp))
      }

      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
      className="bg-slate-900"
    />
  )
}
