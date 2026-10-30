# 🇮🇳 Bharat AI — Hardware Intelligence & Sovereign Sourcing Platform

A data-driven computational profiling, predictive hardware benchmarking, and multi-criteria decision platform built for Indian AI startups, researchers, and public-sector teams to objectively select and source deployment silicon.

---

## 📂 Repository File Structure & Architecture

To make navigation seamless, files are organized into dedicated, logical modules:

```text
TechGig-main/
│
├── 🌐 Vercel & Deployment Configuration
│   ├── vercel.json                 # Vercel Monorepo build, rewrite & routing rules
│   ├── requirements.txt            # Root Python dependencies for Vercel Serverless runtime
│   ├── package.json                # Root automation scripts (build, dev, test)
│   ├── docker-compose.yml          # Local multi-container development (Postgres + Backend + Frontend)
│   └── docs/
│       └── VERCEL_DEPLOYMENT.md    # Complete step-by-step Vercel deployment guide
│
├── ⚡ API & Serverless Handler
│   └── api/
│       └── index.py                # Vercel Serverless Function entrypoint (FastAPI ASGI handler)
│
├── 🖥️ Frontend (React 18 + TypeScript + Vite + Tailwind CSS)
│   ├── vercel.json                 # SPA client-side routing rewrites for frontend-only deploys
│   ├── package.json                # Frontend dependencies and build scripts
│   ├── tailwind.config.js          # Ice Silver, Deep Aubergine & Marigold design tokens
│   ├── vite.config.ts              # Vite bundler configuration with dev API proxy
│   └── src/
│       ├── api/
│       │   ├── client.ts           # Typed API client with auto-token management & base URL resolution
│       │   └── types.ts            # Full TypeScript interfaces for Models, Hardware, Projects, RFQs
│       ├── components/
│       │   ├── Nav.tsx             # Sticky navigation header with live user & status badge
│       │   ├── Shell.tsx           # Dynamic workspace shell header with live project name
│       │   ├── ProtectedRoute.tsx  # JWT authentication guard for protected routes
│       │   └── ProjectModal.tsx    # Create and Edit workspace modal dialog
│       ├── context/
│       │   ├── AuthContext.tsx     # Global authentication state, login, signup & me
│       │   └── ToastContext.tsx    # Floating toast alert notification system
│       ├── pages/
│       │   ├── Landing.tsx         # Editorial landing page with architectural grid lines
│       │   ├── Auth.tsx            # Login & signup with real backend validation
│       │   ├── Dashboard.tsx       # Workspace overview with live hardware metrics
│       │   ├── Projects.tsx        # Project list, CRUD, and status management
│       │   ├── ProjectDetail.tsx   # Model upload zone (.onnx/.pt/.pth/.tflite) and specifications
│       │   ├── Analysis.tsx        # Computational profile (FLOPs, weights, op-histogram)
│       │   ├── Recommendations.tsx # TOPSIS multi-criteria hardware ranking matrix
│       │   ├── Suppliers.tsx       # Indian supplier directory, city filters & quote requests
│       │   └── Report.tsx          # Downloadable assessment dossier
│       ├── main.tsx                # App routing configuration
│       └── styles.css              # Custom styling, ambient lighting & editorial theme
│
├── ⚙️ Backend (FastAPI + SQLAlchemy 2.0 + SQLite / PostgreSQL)
│   ├── Dockerfile                  # Container definition for production backend
│   ├── requirements.txt            # Python dependencies (FastAPI, PyJWT, SQLAlchemy, Argon2)
│   ├── alembic.ini                 # Database migration configuration
│   ├── app/
│   │   ├── config.py               # Pydantic Settings (DB URL, JWT secret, CORS)
│   │   ├── database.py             # SQLAlchemy 2.0 engine, SessionLocal & get_db dependency
│   │   ├── main.py                 # FastAPI application routes (both / and /api prefixes)
│   │   ├── models.py               # ORM Tables: HardwareDevice, Benchmark, Analysis, etc.
│   │   ├── schemas.py              # Pydantic request/response validation schemas
│   │   └── security.py             # Password hashing (Argon2) & JWT token encoding
│   ├── alembic/
│   │   ├── env.py                  # Alembic environment with SQLite batch migration support
│   │   └── versions/               # Schema version history
│   └── tests/
│       ├── conftest.py             # Pytest in-memory database & TestClient fixtures
│       ├── test_auth.py            # Authentication, registration, and token tests
│       ├── test_projects.py        # Project CRUD test suite
│       ├── test_models.py          # Model uploads & validation tests
│       └── test_hardware_and_suppliers.py # Hardware listing & RFQ quote tests
│
├── 📊 Data & Notebooks (Phased Pipeline)
│   ├── data/                       # Hardware specifications (40+ devices) and benchmarks
│   ├── notebooks/                  # Exploratory Data Analysis & Model Training notebooks
│   ├── samples/                    # Pre-packaged sample models (MobileNetV2, tiny transformers)
│   └── pytest.ini                  # Pytest test discovery configuration
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Run Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 2. Run Frontend Dev Server
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ☁️ Deploying to Vercel

The project includes pre-configured **`vercel.json`** files for zero-configuration deployments:

1. **Push your code to GitHub**.
2. **Import repository into Vercel** ([vercel.com/new](https://vercel.com/new)).
3. Keep default settings (`./` root directory) or set root directory to `frontend`.
4. Add environment variables in Vercel settings:
   - `DATABASE_URL`: Cloud Postgres connection string (e.g., from Neon or Supabase).
   - `JWT_SECRET`: Secure 32-character random string.
5. Click **Deploy**!

For detailed configuration options, see [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md).

---

## 🧪 Running Automated Tests

Run the full pytest backend test suite from the repository root:
```bash
python -m pytest
```
All tests use an isolated in-memory SQLite fixture.
