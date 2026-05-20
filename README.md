# Checkers vs AI

Browser-based checkers game built with React, TypeScript, Vite, and Tailwind CSS. You play Red against a Black AI that uses minimax search with alpha-beta pruning, tactical move ordering, and a modular board evaluation function.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

Build a production bundle with:

```bash
npm run build
```

Preview the production bundle locally with:

```bash
npm run preview
```

## Gameplay

- Human player: Red
- AI player: Black
- Forced captures are enforced.
- Multi-jump capture chains must be completed.
- Regular pieces promote on the opponent's back row.
- Kings use the existing flying-king rules: they can slide diagonally across open squares and capture over an opponent with any empty landing square beyond it.

## AI Architecture

The game rules live in `src/game/checkers.ts` and remain the single source of truth for board state, legal moves, forced captures, promotions, multi-jump continuation, and winner detection. The AI never duplicates that logic; it searches by calling the same move generation and immutable move application functions used by the UI.

AI modules:

- `src/ai/aiPlayer.ts` maps difficulty levels to search depth and exposes sync/async move selection.
- `src/ai/minimax.ts` runs recursive minimax with alpha-beta pruning, terminal-state scoring, transposition caching, and optional search stats.
- `src/ai/evaluation.ts` scores positions from the AI player's perspective.
- `src/ai/moveOrdering.ts` improves alpha-beta efficiency by searching captures, promotions, king moves, and central moves first.
- `src/ai/player.ts` keeps a small compatibility wrapper for Black move selection.

## Difficulty

The UI exposes three search depths:

| Difficulty | Depth | Notes |
|---|---:|---|
| Easy | 2 | Fast tactical lookahead |
| Medium | 4 | Stronger planning without much delay |
| Hard | 6 | Deeper search for competitive play |

## Evaluation Heuristics

The evaluation function combines:

- Regular piece and king material
- Mobility
- Advancement toward promotion
- Center control
- Back-row guard value
- Capture potential
- Piece safety against immediate captures
- Win/loss terminal scoring

Scores are positive for the AI player and negative for the opponent, which keeps the search reusable for either side.

## Project Structure

```text
checkers-ai-engineering/
├── src/
│   ├── ai/              # Minimax AI, evaluation, and move ordering
│   ├── components/      # React board rendering
│   ├── game/            # Checkers rules and board state
│   ├── App.tsx          # Game loop and UI integration
│   └── main.tsx         # React entry point
├── package.json
└── vite.config.ts
```

## Deployment

This is a static Vite app. Deploy the repository root to a static host.

| Host | Settings |
|---|---|
| Vercel | Framework preset: Vite, build command: `npm run build`, output directory: `dist` |
| Netlify | Build command: `npm run build`, publish directory: `dist` |
