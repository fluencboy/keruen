import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { LeafletLoader } from '@/components/maps/LeafletLoader'

export const metadata: Metadata = {
  title: 'Keruen — Mangystau Digital Logistics Control Center',
  description: 'Real-time digital twin of regional logistics and transit infrastructure',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-kt-dark text-slate-100 antialiased">
        <Providers>{children}</Providers>
        <LeafletLoader />
      </body>
    </html>
  )
}
