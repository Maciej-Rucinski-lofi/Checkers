# Checkers vs AI

Browser-based American checkers game with a **self-learning AI opponent**. The AI starts weak and improves as you play — all learning happens locally in your browser using Minimax search and Temporal Difference learning. No server required.

```
checkers-ai-engineering/
└── frontend/   React + Vite UI (deploy to Vercel / Netlify)
```

## Quick start

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## How the AI works

The AI (Black) uses **Minimax with Alpha-Beta pruning** (depth 2) to search ahead and pick the best move. Its evaluation function is a weighted combination of 8 board features:

- Piece count and king count advantage
- Piece advancement and center control
- Back-row safety and mobility
- Capture threats and trade management

After each game, **Temporal Difference (TD) learning** adjusts the feature weights based on the outcome. Weights are saved to `localStorage` and persist between sessions.

**Difficulty curve:**

| Games played | AI level |
|---|---|
| 1–5 | Easy — high exploration, weak evaluation |
| 6–14 | Noticeably harder — avoids blunders, prefers captures |
| ~15 | Medium — consistent, punishes clear mistakes |
| 25–30 | Intermediate — plans ahead, controls center |

## Deployment

The frontend is a fully static site — deploy to any static host:

| Host | Notes |
|------|-------|
| Vercel | Recommended — set Root Directory to `frontend/` on import |
| Netlify | Set publish directory to `frontend/dist` |

## Docs

- [frontend/README.md](frontend/README.md) — UI setup, how to play, project structure
