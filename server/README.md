# Checkers — AI Server

Express.js + TensorFlow.js backend that owns the shared checkers AI model. All players' browsers connect here to download weights and submit game results. The server retrains the model after each submitted game so the AI improves globally.

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | [Node.js](https://nodejs.org/) LTS |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.8 |
| HTTP | [Express](https://expressjs.com/) 4 |
| AI training | [TensorFlow.js for Node](https://www.tensorflow.org/js/guide/nodejs) |
| Storage | JSON files (`data/experiences.json`, `data/meta.json`) |

## Prerequisites

- [Node.js](https://nodejs.org/) LTS

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server starts at [http://localhost:3001](http://localhost:3001).

## Production

```bash
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled output
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port to listen on |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (set to your Vercel URL in production) |

## API endpoints

### `GET /model`

Returns the current model weights so the browser can load them into TF.js.

**Response:**
```json
{
  "modelJson": { ... },
  "weightData": "<base64-encoded weight binary>"
}
```

### `POST /experiences`

Submit a finished game for training.

**Request body:**
```json
{
  "states": [[0,1,0,...], ...],
  "outcome": 1
}
```

- `states`: array of 128-element feature vectors (one per Black turn taken)
- `outcome`: `1` if Black (AI) won, `-1` if Red (human) won

**Response:** `{ "ok": true }`

### `GET /stats`

Returns global training statistics.

**Response:** `{ "gamesPlayed": 42 }`

## How it learns

1. A browser submits a game via `POST /experiences`.
2. The server stores it in `data/experiences.db` (SQLite, up to 80 recent games kept).
3. A training run starts asynchronously — concurrent submissions are queued.
4. The updated weights are saved to `data/model/` on disk.
5. The next browser that calls `GET /model` gets the improved weights.

## Data persistence

| File | Contents |
|------|----------|
| `data/experiences.json` | Last 80 game experiences (states + outcome) |
| `data/meta.json` | Global games played counter |
| `data/model/model.json` | Model architecture + weight manifest |
| `data/model/weights.bin` | Serialised weight tensors |

The `data/` directory is created automatically on first start. Back it up if you want to preserve training progress.

## Deployment (Railway)

1. Create a new Railway project and connect this repository (or the `server/` subdirectory).
2. Set the **root directory** to `server/` if deploying from a monorepo.
3. Set environment variables:
   - `FRONTEND_ORIGIN` → your Vercel frontend URL (e.g. `https://checkers-xxx.vercel.app`)
4. Add a **persistent volume** mounted at `/app/data` so training data survives restarts.
5. Railway will run `npm start` after `npm run build` automatically.

## Project structure

```
src/
├── index.ts       # Express app, route handlers
├── model.ts       # Load/save TF.js model from disk
├── trainer.ts     # Async training loop with queuing
├── db.ts          # SQLite experience storage
└── encoding.ts    # Board state encoding (shared with frontend)
```
