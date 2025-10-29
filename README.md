# Prompt→Image Hub (Multi‑AI Image Generator)

A minimal Next.js + Tailwind dashboard to batch generate images from 500–1000 prompts using multiple AI providers.
This starter ships with a safe mock engine. Swap in your real provider calls in `app/page.jsx` inside `providerEngines`.

## Quick Start (Local)
```bash
npm i
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel
1. Push this folder to a new GitHub repo.
2. In Vercel, **Add New Project → Import** the repo.
3. Build settings: defaults are fine.
4. Deploy.

## Provider Integration
Edit `app/page.jsx` and replace the mock engines with real API calls (OpenAI DALL·E, Google Imagen via Gemini, Stability, etc.).
Keys are saved in localStorage in this demo. For production, call your backend API routes to keep keys secret.

## Features
- Dark/Light toggle
- Gmail-style login (email box, must end with `@gmail.com`)
- Provider dropdown + save/view API key
- Paste 500–1000 prompts (one per line)
- Generate / Pause / Resume / Stop / Clear
- Per-image filename (letters only), preview grid
- Retry failed items, ZIP download

Developed By **Anil Chandra Barman**
