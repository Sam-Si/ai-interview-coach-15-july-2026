# AI Interview Coach

Practice technical interviews with an AI interviewer powered by **Groq** (Llama 3.3 70B). Pick a topic and difficulty, answer questions in a live chat, and receive a structured performance report when the session ends.

| Layer | Stack | Default URL |
|-------|--------|-------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui | http://localhost:3000 |
| Backend | FastAPI, Uvicorn, Pydantic, Groq SDK | http://localhost:8000 |

**Repository:** https://github.com/Sam-Si/ai-interview-coach-15-july-2026

---

## Table of contents

1. [How the app works](#how-the-app-works)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Environment setup (API key)](#environment-setup-api-key)
5. [Run locally](#run-locally)
6. [API reference](#api-reference)
7. [Using the app](#using-the-app)
8. [Make changes and push to GitHub](#make-changes-and-push-to-github)
9. [Security checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

---

## How the app works

```
Browser (Next.js)  ──POST /api/interview/next──►  FastAPI  ──►  Groq LLM
       │                                              │
       └──POST /api/report/generate───────────────────┘
```

1. **Setup** — Choose a preset topic (or custom text) and difficulty (`Easy` / `Medium` / `Hard`).
2. **Interview** — The frontend calls `POST /api/interview/next` with the full conversation history. The backend asks Groq for the next interviewer message. When the model decides the session is over, it includes `[INTERVIEW COMPLETE]` (stripped before showing the candidate).
3. **Report** — On completion (or when the flow ends), the frontend calls `POST /api/report/generate`. The backend returns JSON with score, strengths, weaknesses, revision areas, verdict, and Pass/Fail.

The frontend hardcodes the backend base URL as `http://localhost:8000` in `frontend/src/app/page.tsx`. Both servers must be running for a full interview.

---

## Project structure

```
.
├── README.md                 # This file
├── .gitignore                # Ignores .env, venv, node_modules, .next, etc.
├── backend/
│   ├── .env.example          # Template for secrets (safe to commit)
│   ├── .env                  # Your real secrets (NEVER commit)
│   ├── .gitignore
│   ├── main.py               # FastAPI app, CORS, /health
│   ├── requirements.txt
│   ├── routers/
│   │   ├── interview.py      # POST /api/interview/next
│   │   └── report.py         # POST /api/report/generate
│   └── services/
│       └── llm_service.py    # Groq client, prompts, report JSON parsing
└── frontend/
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx      # Main UI (setup → interview → report)
    │   │   └── globals.css
    │   ├── components/ui/    # shadcn-style UI primitives
    │   └── lib/utils.ts
    └── ...
```

---

## Prerequisites

Install these before running the project:

| Tool | Suggested version | Check |
|------|-------------------|--------|
| **Python** | 3.11+ (3.13 works) | `python3 --version` |
| **Node.js** | 18+ (LTS recommended) | `node --version` |
| **npm** | Comes with Node | `npm --version` |
| **Git** | Any recent | `git --version` |
| **Groq API key** | Free tier available | [console.groq.com](https://console.groq.com/) |

Optional: [GitHub CLI](https://cli.github.com/) (`gh`) for creating PRs and managing remotes.

---

## Environment setup (API key)

The backend loads `GROQ_API_KEY` from `backend/.env` via `python-dotenv`.

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and replace the placeholder with your real key:

```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

> **Important:** Never commit `backend/.env`. It is listed in `.gitignore`. Only `backend/.env.example` (with a placeholder) belongs in the repo.

Without a valid key, interview and report endpoints will fail with a configuration error.

---

## Run locally

You need **two terminals**: one for the API, one for the UI.

### 1. Backend (port 8000)

```bash
cd backend

# Create and activate a virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Ensure backend/.env exists with GROQ_API_KEY (see above)

# Start FastAPI with auto-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

Interactive docs (while the server is running):

- Swagger UI: http://localhost:8000/docs  
- ReDoc: http://localhost:8000/redoc  

### 2. Frontend (port 3000)

In a **second** terminal:

```bash
cd frontend

# Install dependencies (first time, or after package.json changes)
npm install

# Start Next.js dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production-style frontend build (optional)

```bash
cd frontend
npm run build
npm start
```

This still expects the backend at `http://localhost:8000` unless you change `BACKEND_URL` in `page.tsx`.

---

## API reference

Base URL: `http://localhost:8000`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Root message |
| `GET` | `/health` | Health check |
| `POST` | `/api/interview/next` | Next interviewer message |
| `POST` | `/api/report/generate` | End-of-interview evaluation |

### `POST /api/interview/next`

**Request body:**

```json
{
  "topic": "Python & Backend Systems",
  "difficulty": "Medium",
  "conversation_history": [
    { "role": "assistant", "content": "Tell me about REST vs GraphQL." },
    { "role": "user", "content": "REST is resource-oriented..." }
  ]
}
```

Use an empty `conversation_history` array to start a new interview.

**Response:**

```json
{
  "response": "Good overview. How would you version a public REST API?",
  "is_complete": false
}
```

When the interview ends, `is_complete` is `true`.

### `POST /api/report/generate`

**Request body:** same shape as interview (`topic`, `difficulty`, full `conversation_history`).

**Response (example shape):**

```json
{
  "score": 78,
  "strengths": "...",
  "weaknesses": "...",
  "revision_areas": "topic A, topic B, topic C",
  "verdict": "...",
  "recommendation": "Pass"
}
```

`recommendation` is either `"Pass"` or `"Fail"`.

### Model

Interviews and reports use Groq model **`llama-3.3-70b-versatile`** (see `backend/services/llm_service.py`).

---

## Using the app

1. Start backend and frontend as above.
2. Open http://localhost:3000.
3. Select a topic (or enter a custom one) and difficulty.
4. Click to start; answer each question in the chat.
5. When the AI finishes the session, a report screen appears with score and feedback.
6. Restart from the report screen to try another session.

Preset topics in the UI:

- Python & Backend Systems  
- React & Frontend Engineering  
- System Design & Architecture  
- Data Structures & Algorithms  
- Custom topic  

---

## Make changes and push to GitHub

This monorepo is tracked as a single Git repository. Remote:

```text
https://github.com/Sam-Si/ai-interview-coach-15-july-2026.git
```

### First-time clone (other machines)

```bash
git clone https://github.com/Sam-Si/ai-interview-coach-15-july-2026.git
cd ai-interview-coach-15-july-2026

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set GROQ_API_KEY

# Frontend
cd ../frontend
npm install
```

Then run both servers as in [Run locally](#run-locally).

### Everyday workflow

```bash
# 1. Start from an up-to-date main (or your feature branch)
git checkout main
git pull origin main

# 2. Optional: create a feature branch
git checkout -b feature/short-description

# 3. Make your code changes, test locally (backend + frontend)

# 4. See what changed
git status
git diff

# 5. Stage only source files (never .env)
git add backend/ frontend/ README.md .gitignore
# Or stage specific files:
# git add backend/routers/interview.py frontend/src/app/page.tsx

# 6. Confirm secrets are not staged
git status
# backend/.env must NOT appear
# Avoid: git add -f backend/.env

# 7. Commit
git commit -m "Describe why you made the change"

# 8. Push
git push -u origin HEAD
# On main (if you commit directly):
# git push origin main
```

### Open a pull request (recommended for larger changes)

```bash
git push -u origin feature/short-description
gh pr create --fill
# Or open the compare URL printed by GitHub after push
```

### Useful Git commands

| Command | Purpose |
|---------|---------|
| `git status` | Modified / staged files |
| `git diff` | Unstaged changes |
| `git diff --staged` | What will be committed |
| `git log --oneline -10` | Recent history |
| `git pull origin main` | Update local main |
| `git restore <file>` | Discard unstaged edits to a file |

### What not to commit

These are ignored by the root `.gitignore` (do not force-add them):

- `backend/.env` and any real API keys  
- `backend/venv/`  
- `frontend/node_modules/`  
- `frontend/.next/`  
- `__pycache__/`, `*.pyc`, `.DS_Store`, IDE folders  

Safe to commit:

- Application source under `backend/` and `frontend/`  
- `backend/.env.example` (placeholder only)  
- `backend/requirements.txt`, `frontend/package.json`, lockfiles  
- `README.md`, `.gitignore`  

### After dependency changes

**Python:**

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
# If you added a package: pip install <pkg> && pip freeze | grep -i <pkg>
# Then update requirements.txt intentionally
```

**Node:**

```bash
cd frontend
npm install                 # after package.json / lockfile changes
# npm install <pkg>         # add a dependency, then commit package.json + package-lock.json
```

---

## Security checklist

Before every push:

1. **No secrets in the tree**
   ```bash
   git status
   # .env must not be listed
   git grep -n 'gsk_' $(git rev-parse HEAD) 2>/dev/null || true
   # Should find nothing in committed history for your new commit
   ```
2. **Never** run `git add -f backend/.env` or commit keys in source/comments.
3. If a key is ever pushed by mistake: **revoke it in the Groq console immediately**, rotate to a new key, and scrub history if needed (e.g. contact GitHub support / use history rewrite carefully).
4. Prefer public repos only when they contain **placeholders** (`.env.example`), not live credentials.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Frontend errors when starting interview | Backend not running | Start uvicorn on port 8000 |
| `GROQ_API_KEY is not set` | Missing or empty `.env` | Copy `.env.example` → `.env` and set a real key |
| 500 from interview/report APIs | Invalid key, quota, or network | Check key in Groq console; read backend terminal logs |
| CORS errors in browser | Backend down or wrong origin setup | Confirm API at `:8000`; app allows all origins for local dev |
| Port already in use | Another process on 3000/8000 | Stop the other process or change the port |
| `ModuleNotFoundError` in backend | venv not activated or deps missing | `source venv/bin/activate` then `pip install -r requirements.txt` |
| Frontend module errors | Deps not installed | `cd frontend && npm install` |
| Changes not on GitHub | Not committed or not pushed | `git status` → commit → `git push` |

Check listening ports:

```bash
# macOS / Linux
lsof -iTCP:8000 -sTCP:LISTEN
lsof -iTCP:3000 -sTCP:LISTEN
```

---

## License

No license file is included yet. Add one (MIT, Apache-2.0, etc.) if you intend others to reuse this code.
