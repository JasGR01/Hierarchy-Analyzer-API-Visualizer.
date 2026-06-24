# BFHL – Node Hierarchy Analyser

**Chitkara University Full Stack Engineering Challenge**

A production-ready full-stack app that analyses directed node-edge strings, builds forest hierarchies, detects cycles, and returns a structured JSON summary.

---

## Live URLs

| Layer    | URL |
|----------|-----|
| Backend  | `https://bajaj-bfhl-api.onrender.com` ← replace after deploy |
| Frontend | `https://bajaj-bfhl.vercel.app` ← replace after deploy |

---

## Project Structure

```
bajaj/
├── .gitignore
├── netlify.toml               ← Netlify build config (frontend)
├── Procfile                   ← Heroku/legacy deploy hook
├── README.md
├── backend/
│   ├── render.yaml            ← Render IaC deploy spec
│   ├── .env.example           ← Backend env template
│   ├── package.json
│   └── src/
│       ├── index.js           ← Express server
│       ├── routes/
│       │   └── bfhl.routes.js ← POST /bfhl  •  GET /health
│       └── utils/
│           ├── validate.js    ← Edge parsing + categorisation
│           └── forest.js      ← Union-Find, DFS, tree builder
└── frontend/
    ├── vercel.json            ← Vercel SPA rewrite rule
    ├── .env.example           ← Frontend env template
    ├── .env                   ← Local dev only (git-ignored)
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js             ← fetch wrapper
        ├── index.css          ← Global design tokens
        ├── hooks/
        │   └── useAnalyser.js ← Form state machine
        └── components/
            ├── InputPanel
            ├── StatusBanner
            ├── IdentityCard
            ├── SummaryBar
            ├── WarningsRow
            └── HierarchyGrid
```

---

## Running Locally

```bash
# Terminal 1 – Backend
cd backend
cp .env.example .env        # then edit with your real values
npm install
npm run dev                 # → http://localhost:3001

# Terminal 2 – Frontend
cd frontend
# .env is already set to VITE_API_URL=http://localhost:3001
npm install
npm run dev                 # → http://localhost:5174

# Run tests
cd backend
npm test                    # 130 tests across 3 suites
```

---

## Deploying

> Full walkthrough: see **deployment_guide.md** in the project artifacts.

### 1 · Push to GitHub (public repo)

```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2 · Backend → Render

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node src/index.js` |
| Health Check Path | `/health` |

**Environment variables to add in Render dashboard:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `USER_ID` | `yourname_ddmmyyyy` |
| `EMAIL_ID` | `your.email@chitkara.edu.in` |
| `COLLEGE_ROLL_NUMBER` | `your roll number` |

Copy the live URL: `https://bajaj-bfhl-api.onrender.com`

### 3 · Frontend → Vercel

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Output Directory | `dist` |

**Environment variable to add in Vercel dashboard:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://bajaj-bfhl-api.onrender.com` |

> **Important:** `VITE_API_URL` is baked into the JS bundle at build time.
> If you update it in the dashboard, you must **redeploy** the frontend.

### 3 (alt) · Frontend → Netlify

The `netlify.toml` file at the repo root handles all build settings automatically.
Just add the `VITE_API_URL` environment variable in the Netlify dashboard and deploy.

---

## API Reference

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-06-24T13:00:00.000Z" }
```

### `POST /bfhl`

**Request**
```json
{ "data": ["A->B", "A->C", "B->D"] }
```

**Response**
```json
{
  "user_id": "jasmeengrewal_24062005",
  "email_id": "jasmeen.grewal@chitkara.edu.in",
  "college_roll_number": "2310992396",
  "hierarchies": [
    { "root": "A", "tree": { "B": { "D": {} }, "C": {} }, "depth": 3 }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

### `POST /bfhl` — cycle response shape

```json
{
  "hierarchies": [
    { "root": "A", "tree": {}, "has_cycle": true }
  ],
  "summary": { "total_trees": 0, "total_cycles": 1, "largest_tree_root": null }
}
```

---

## Sample curl Requests

```bash
# Simple tree
curl -X POST https://<host>/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "A->C", "B->D"]}'

# Duplicate + invalid
curl -X POST https://<host>/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "A->B", "hello", "1->2"]}'

# Pure cycle
curl -X POST https://<host>/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "B->C", "C->A"]}'

# Multi-parent conflict
curl -X POST https://<host>/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "A->C", "B->D", "C->D"]}'
```

---

## Validation Rules

| Rule | Behaviour |
|------|-----------|
| Format | Must match `X->Y` (single uppercase A-Z on both sides) |
| Whitespace | Trimmed before validation |
| Self-loop `A->A` | Invalid |
| Exact duplicate | First kept; later → `duplicate_edges` (once) |
| Multi-parent conflict | First parent wins; later edges for same child → `duplicate_edges` |
| Cycle detection | Iterative DFS with grey/black colouring |
| Root selection | Node not appearing as any child; lex-smallest on tie |
| Pure-cycle root | Lex-smallest node in that component |
| `largest_tree_root` | Max depth; lex-smaller root on tie; `null` if all cyclic |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+, Express.js, CORS, dotenv |
| Frontend | React 19, Vite 8, CSS Modules |
| Tests | Jest 29, Supertest (130 tests) |
| Fonts | Inter + JetBrains Mono |
| Deploy | Render (backend), Vercel / Netlify (frontend) |
# Hierarchy-Analyzer-API-Visualizer.
