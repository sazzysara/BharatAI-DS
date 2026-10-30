# 🚀 Vercel Deployment Guide for Bharat AI Platform

This repository is optimized for deployment on [Vercel](https://vercel.com). You can deploy it using either of two standard approaches:

---

## ⚡ Method 1: Full-Stack Monorepo on Vercel (Recommended)

Vercel automatically builds both the **Vite React Frontend** and the **FastAPI Python Serverless Functions** in a single deployment.

### Step 1: Push Repository to GitHub
Ensure all code and the following configuration files are committed:
- `vercel.json` (Root Vercel orchestration)
- `api/index.py` (FastAPI Serverless Function entrypoint)
- `requirements.txt` (Root Python runtime requirements)
- `frontend/package.json` & `frontend/`

### Step 2: Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **"Add New..."** → **"Project"**.
2. Select your `TechGig-main` or `Bharat-AI` repository.
3. Keep **Root Directory** as `./` (default).
4. Vercel will automatically read `vercel.json`.

### Step 3: Configure Environment Variables
In **Project Settings → Environment Variables**, add:
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+psycopg://user:pass@host:5432/db` | Cloud Postgres connection string (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway) |
| `JWT_SECRET` | `your-secure-random-32-character-secret` | For signing JWT bearer tokens |
| `CORS_ORIGINS` | `*` or `https://your-project.vercel.app` | Allowed CORS origins |

> **Note on SQLite vs PostgreSQL on Vercel**:
> Vercel Serverless Functions have an ephemeral read-only file system. For production deployments with persistent projects and models, connect a cloud PostgreSQL database (free on [Neon Serverless Postgres](https://neon.tech) or Supabase).

### Step 4: Click Deploy!
- Frontend is served at `https://your-project.vercel.app`
- API endpoints are served at `https://your-project.vercel.app/api/...`

---

## 🌐 Method 2: Frontend on Vercel + Backend on Railway/Render

If you prefer running the FastAPI backend as a persistent container (e.g. for long-running ONNX/ML model profiling jobs) on **Railway**, **Render**, or **Docker**:

### Step 1: Deploy Backend to Railway or Render
1. Deploy `backend/Dockerfile` to Railway or Render.
2. Note your backend URL (e.g., `https://bharat-ai-api.up.railway.app`).

### Step 2: Deploy Frontend to Vercel
1. Import repository into Vercel.
2. In Project Settings, set **Root Directory** to `frontend`.
3. In **Environment Variables**, add:
   ```env
   VITE_API_URL=https://bharat-ai-api.up.railway.app
   ```
4. `frontend/vercel.json` ensures that Single Page Application (SPA) routing works seamlessly without 404 errors on page reload.

---

## 🛠️ Verification Checklist After Deployment

- [ ] Visit `https://your-project.vercel.app/` — verify Ice Silver & Marigold landing page renders.
- [ ] Test `https://your-project.vercel.app/api/health` — returns `{"status": "ok"}`.
- [ ] Create account via `/signup` — confirms token storage and redirects to `/dashboard`.
- [ ] Refresh `/dashboard` or `/projects` — confirms SPA rewrites work without 404s.

