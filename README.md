# CrownTALK (CrownTALK 2) — X Comment Generator

This repo contains:
- **frontend/**: Next.js UI
- **backend/**: Flask API (Gunicorn-ready)

## Quick start (local)

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional
export $(cat .env | xargs)  # optional (or use direnv)
python main.py
```

Backend defaults to `PORT=10000`.

### 2) Frontend

```bash
cd frontend
npm i
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Docker compose (optional)

```bash
docker compose up --build
```

## Environment variables

### Frontend
- `NEXT_PUBLIC_BACKEND_URL` (required)
- `NEXT_PUBLIC_CT_HMAC_SECRET` (optional) — if set, the UI signs requests.

### Backend
- `PORT` (default `10000`)
- `GROQ_API_KEY` (required if using Groq providers)
- `OPENAI_API_KEY` / `OPENROUTER_API_KEY` (optional, depending on your provider order)
- `CROWNTALK_HMAC_SECRET` (optional) — **must match** `NEXT_PUBLIC_CT_HMAC_SECRET` if you enable signing.
- `CROWNTALK_HMAC_ENFORCE` (default `false`) — set `true` to reject unsigned requests.
- `CROWNTALK_API_VERSION` (optional) — returned in the API envelope.

## Notes
- The API supports both legacy JSON errors (`{error, code}`) and the newer envelope (`{success, requestId, apiVersion, data, error}`), and the UI handles both.
- Bulk URL processing is conservatively parallel (max 2 workers by default) to reduce provider rate-limit errors.
