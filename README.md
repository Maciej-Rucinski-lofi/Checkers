# Checkers vs AI — Monorepo

Browser-based American checkers game with a **globally shared neural-network AI**. Every game played by any user is sent to a central server, which retrains the model so the AI improves for everyone.

```
checkers-ai-engineering/
├── frontend/   React + Vite + TF.js UI (deploy to Vercel / Netlify)
└── server/     Express + TF.js Node backend (deploy to Railway / Render)
```

## Quick start (local)

**Terminal 1 — start the server:**

```bash
cd server
npm install
npm run dev
# Running at http://localhost:3001
```

**Terminal 2 — start the frontend:**

```bash
cd frontend
npm install
# .env.local already points to http://localhost:3001
npm run dev
# Open http://localhost:5173
```

## Architecture

```
Browser  ──GET /model──────► Server (Express + TF.js Node)
         ◄── weights ──────      │
                                  │ trains on received games
         ──POST /experiences──►   │ saves model to data/model/
                                  │
         ──GET /stats ────────►   └── data/experiences.json
                                      data/meta.json
```

- The **server** owns and trains the model. Weights are stored on disk.
- The **browser** downloads weights at startup, uses TF.js for inference, and POSTs game results after each game.
- No local training happens in the browser — all learning is centralised.

## Deployment

| Part | Host | Notes |
|------|------|-------|
| `frontend/` | Vercel / Netlify | Static site, set `VITE_API_URL` env var |
| `server/` | Railway / Render | Needs a persistent volume at `/app/data` |

See each subdirectory's `README.md` for detailed deployment instructions.

## Docs

- [frontend/README.md](frontend/README.md) — UI setup, how to play, project structure
- [server/README.md](server/README.md) — API endpoints, training loop, deployment
