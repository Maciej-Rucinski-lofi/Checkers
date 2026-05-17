# Checkers — Frontend

React + Vite UI for the Checkers vs AI game. Connects to the shared AI server for model weights and experience reporting. All players share one global model that improves over time.

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | [React](https://react.dev/) 19 |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.8 |
| Build tool | [Vite](https://vite.dev/) 6 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 |
| AI inference | [TensorFlow.js](https://www.tensorflow.org/js) (browser) |

## Prerequisites

- [Node.js](https://nodejs.org/) LTS
- The **server** running (see `../server/README.md`) or a deployed server URL

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set VITE_API_URL to your server URL
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The server must be running at `http://localhost:3001` (default).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | URL of the AI server |

Set this to your deployed Railway/Render URL in production.

## Build for production

```bash
npm run build      # Type-check + Vite build → dist/
npm run preview    # Preview the production build locally
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

## How to play

| Side | Player |
|------|--------|
| **Red** (bottom) | You |
| **Black** (top) | Global AI |

- Either player goes first (random each game).
- Click a red piece → green dots show legal moves → click a dot to move.
- After each game your moves are sent to the server, which retrains the shared model.
- The counter **Global games played** reflects all games from all players.

### Rules

| Rule | Description |
|------|-------------|
| Men | Move one square diagonally forward. |
| Captures | Jump over an adjacent opponent to an empty square. Men capture in all directions. |
| Mandatory capture | If any jump exists, you must take it. |
| Multi-jump | Continue jumping with the same piece until no more jumps are possible. |
| Kings | Reach the back row to promote. Kings slide any distance diagonally and jump any distance. |

## Project structure

```
src/
├── App.tsx               # Game loop, server communication
├── ai/
│   ├── encoding.ts       # Board → neural network input (128 features)
│   ├── experience.ts     # POST game results to server
│   ├── model.ts          # Fetch model weights from server, run inference
│   └── player.ts         # Move selection (greedy + exploration)
├── components/
│   └── Board.tsx         # 8×8 board UI
└── game/
    └── checkers.ts       # Rules engine (moves, captures, promotion)
```

## Windows notes

If PowerShell blocks `npm`, use `npm.cmd` or run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
