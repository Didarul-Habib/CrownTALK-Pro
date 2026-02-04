# CrownTALK UI (Next.js)

## Setup
1. Install deps

```bash
npm i
```

2. Add env var:

Create `.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=https://YOUR-RENDER.onrender.com
```

3. Run

```bash
npm run dev
```

## Netlify
Set the environment variable in Netlify:
- `NEXT_PUBLIC_BACKEND_URL`

Build command: `npm run build`

> This project expects your backend to expose `POST /comment`.
