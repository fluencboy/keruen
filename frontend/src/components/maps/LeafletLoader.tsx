'use client'
import { useEffect } from 'react'

export function LeafletLoader() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs='
      script.crossOrigin = ''
      document.head.appendChild(script)
    }
  }, [])
  return null
}
