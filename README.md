# CrownTALK 👑 — Professional X Comment Generator

CrownTALK is a production-grade web app that generates **professional, human-style replies** for X (Twitter) posts, with a particular focus on crypto / Web3 content and GM-style replies.

This repo contains both the **frontend** (Next.js) and the **backend** (Flask + Gunicorn):

- `Frontend/` — Next.js 14 + React 18 UI (TypeScript)
- `backend/` — Flask API server, deployed behind Gunicorn (Render-ready)

---

## Features

- **Multi-URL batch generation**
  - Paste multiple X links at once and get structured replies per URL.
  - Deduplication and per-URL error handling.

- **Professional CT-style replies**
  - Short, clear, low-hype comments.
  - Optional crypto-project grounding via research files.

- **GM / greeting awareness**
  - GM / “good morning” posts get **two specialized comments**:
    - Comment #1: short, pure greeting (no question).
    - Comment #2: short GM line with exactly **one** roadmap/alpha/updates question.
  - Greets the author with a trimmed name: e.g. `Waleswoosh` → `Wale` → `GM Wale, ...`.

- **Tone / intent controls**
  - Tone presets (e.g., neutral, optimistic, skeptical).
  - Intent modes (e.g., quote, question reply, metrics reply, greeting, etc.).
  - Optional “native language” mode with English vs native output logic.

- **Quality modes**
  - `fast`, `balanced`, `pro` quality tiers control model choice, max tokens, and temperature.

- **Pipeline UI**
  - Live pipeline stages: *Fetching → Generating → Polishing → Finalizing*.
  - Per-run queue counts (e.g., `Queue 1/4`).

- **Run history & export**
  - Local run history in the UI.
  - Server-side history export to JSON / TXT / CSV (for power users).

- **Clipboard history & quick actions**
  - One-click copy per comment.
  - Edit in place, reroll per URL.
  - Clipboard history with export options.

- **Access gating & HMAC signing**
  - Optional access code gate.
  - Optional HMAC request signing between frontend and backend.

---

## Tech Stack

**Frontend**

- Next.js 14.2
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Ladle (for component stories)
- Playwright (E2E tests)

**Backend**

- Flask 3.x
- Gunicorn (gthread workers)
- Pydantic (request schemas)
- Requests (HTTP client)
- Psycopg2 (Postgres via Supabase on Render)
- Groq / OpenAI / other LLM provider SDKs
- BeautifulSoup4 (HTML parsing for article mode)

---

## Project Structure

```text
CrownTALK 👑/
    Frontend/
      app/                # Next.js app routes (main UI)
      components/         # UI components (Controls, Results, Pipeline, etc.
      docs/
      USER_MANUAL.md      #User guidelines about how to use CrownTALK site
      lib/                # API client, types, quality heuristics, storage helpers
      public/             # Static assets
      netlify.toml        # Netlify deploy config
      package.json
      tsconfig.json
      tailwind.config.ts

    backend/
      main.py             # Flask application entrypoint
      api.py              # Provider + generation wrapper logic
      schemas.py          # Pydantic models for requests / responses
      utils.py            # Helpers (logging, research loading, etc.)
      gunicorn_config.py  # Gunicorn settings (Render)
      Dockerfile
      Procfile
      requirements.txt
