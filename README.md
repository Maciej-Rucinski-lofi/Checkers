# Checkers

A browser-based American checkers game built with React. Play against a neural-network AI as **Red**; **Black** is controlled by the computer and improves the more you play.

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | [React](https://react.dev/) 19 |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.8 |
| Build tool | [Vite](https://vite.dev/) 6 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 (`@tailwindcss/vite`) |
| AI / ML | [TensorFlow.js](https://www.tensorflow.org/js) — value network trained in the browser |

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (includes `npm`)

After installing Node.js, restart your terminal or IDE so `node` and `npm` are on your PATH.

### Windows notes

If PowerShell blocks `npm` with an execution policy error, use either:

```powershell
npm.cmd run dev
```

or allow scripts for your user (one-time):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open the URL shown in the terminal (usually [http://localhost:5173](http://localhost:5173)).

### Other scripts

```bash
npm run build    # Type-check and build for production
npm run preview  # Preview the production build locally
```

## How to play

### You vs AI

| Side | Player |
|------|--------|
| **Red** (bottom) | You |
| **Black** (top) | Neural-network AI |

**Black moves first.** When it is the AI’s turn, the board is not clickable. After each finished game, the network trains on that game and all previous games stored in your browser.

The AI uses a small amount of **exploration** (random moves) early on; that rate drops as you play more games, so it relies more on what it has learned.

Use **New game** to reset the board and play again.

### Making a move (Red / human)

1. Click one of your red pieces (yellow highlight).
2. **Green dots** show legal destinations.
3. Click a highlighted square to move.

Click elsewhere to deselect (unless you must continue a jump).

### Rules

| Rule | Description |
|------|-------------|
| Men (non-kings) | Move one square diagonally **forward** on a non-capture turn. |
| Captures | Jump over an adjacent opponent piece to an empty square behind it. Men may capture **forward and backward**. |
| Mandatory capture | If any capture is available, you must jump — regular moves are not allowed. |
| Multi-jump | After a capture, if the same piece can jump again, you **must** continue with that piece until no further jumps are possible. |
| Kings | Crowned when a man reaches the opposite back row. Kings slide **any number of squares** along a diagonal. They may capture by jumping an opponent and landing on **any empty square** beyond it on that line, and can chain multiple jumps like men. |

Kings are shown with a gold crown icon on the piece.

## How the AI learns

1. Before each Black move, the board is encoded as a 128-number feature vector (32 dark squares × 4 piece types).
2. A feedforward network (128 → 64 → 32 → 1) estimates how good the position is for Black.
3. The AI picks the move whose resulting board scores highest (with occasional random moves for exploration).
4. When a game ends, every position from Black’s turns is labeled **+1** if Black won or **−1** if Red won.
5. The network is retrained on the last **80 games** (stored in `localStorage`) and weights are saved in the browser.

No server or dataset download is required — learning happens entirely on your machine.

## Project structure

```
src/
├── App.tsx              # Human vs AI flow, training triggers
├── ai/
│   ├── encoding.ts      # Board → neural network input
│   ├── model.ts         # TensorFlow.js model load/save
│   ├── player.ts        # Move selection for Black
│   ├── trainer.ts       # Post-game training
│   └── experience.ts    # Replay buffer (localStorage)
├── components/
│   └── Board.tsx        # 8×8 board UI
└── game/
    └── checkers.ts      # Rules engine
```

## License

Private project — not published to npm.
