# KaspiTransit — Digital Logistics Control Center

**Real-time digital twin of Mangystau Region logistics and transit infrastructure.**

Covers: Aktau Port · Kuryk Port · Beineu · Zhanaozen · Temir-Baba Border

---

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- (Optional) Gemini API key for AI features

### 2. Setup

```bash
# Clone / extract the project
cd kaspitransit

# Copy env file
cp .env.example .env

# Add your Gemini API key (optional but recommended)
# Edit .env and set GEMINI_API_KEY=your_key_here

# Start everything
docker compose up
```

### 3. Access the application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin / Akimat | admin@kaspitransit.kz | admin123 |
| Operator | operator@kaspitransit.kz | operator123 |
| Analyst | analyst@kaspitransit.kz | analyst123 |
| Shipper | shipper@kaspitransit.kz | shipper123 |
| Driver | driver@kaspitransit.kz | driver123 |

---

## Features

### 🗺️ Akimat Command Center (Admin/Operator)
- Full-screen regional map with checkpoint markers
- Color-coded congestion (Green/Yellow/Red)
- Real-time KPI cards (active shipments, vehicles, cargo volume, wait times)
- Corridor Health Score (0-100)

### 📦 Shipper Portal
- Create cargo orders (manual or via AI assistant)
- Order history with status tracking
- Live status progression tracker

### 🤖 AI Order Assistant
- Natural language order creation via Gemini
- *"Need to send 40 tons of wheat from Beineu to Aktau Port tomorrow"*
- Automatic field extraction with confidence score

### 🎫 Slot Management
- View available time slots by checkpoint and date
- One-click booking with QR code generation
- Digital pass for checkpoint entry

### 🚛 Driver Dashboard
- Active assignment display
- Digital QR pass
- Checkpoint wait time predictions

### 📊 Analytics (Analyst/Admin)
- AI Copilot: ask questions about logistics performance
- Cargo volume trends, congestion heatmaps
- Corridor utilization, delay distribution
- Transport mode distribution

### 🧪 Simulation Engine
- 4 scenarios: Caspian Storm, Border Closure, +30% Growth, Maintenance
- Impacts checkpoints, orders, and predictions
- Full results with affected checkpoints detail

### ⚡ Live Operations Feed
- WebSocket-powered real-time event stream
- Notifications panel with read/unread management

### 🔮 ML Predictions
- RandomForestRegressor trained on 50,000 synthetic records
- Predicts: wait time, congestion level, risk score
- Features: checkpoint, hour, weekday, weather, slot load, cargo type

---

## Architecture

```
kaspitransit/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── api/routes/   # 11 route modules
│   │   ├── core/         # Auth, config
│   │   ├── db/           # Database + seeder
│   │   ├── ml/           # RandomForest predictor
│   │   ├── models/       # SQLAlchemy models (12 tables)
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Gemini AI, QR, Health, WebSocket
│   └── alembic/          # DB migrations
├── frontend/             # Next.js 14 TypeScript frontend
│   └── src/
│       ├── app/          # 7 page routes
│       ├── components/   # Maps, charts, UI
│       └── lib/          # API client, auth, utils
└── docker-compose.yml
```

## Database

12 tables: users · checkpoints · vehicles · orders · slots · notifications · events · predictions · simulations · audit_logs · weather_conditions · transit_statistics

Seeded with: **5,000 orders** · **1,000 vehicles** · **120 days** of history

---

## Gemini AI Features

Without API key: Falls back to rule-based extraction  
With API key: Full natural language order extraction + analytics copilot

Get key: https://aistudio.google.com/app/apikey
