import {
  applyMove,
  getAllLegalMoves,
  getWinner,
  type BoardState,
  type Move,
  type Player,
  type Position,
} from "../game/checkers";
import { extractFeatures } from "./features";
import { evaluate } from "./weights";

const DEPTH = 4;
const WIN_SCORE = 1000;

/**
 * Picks the best move for Black using alpha-beta minimax with move ordering.
 * Returns null if no moves are available (Black has lost).
 */
export function bestBlackMove(
  board: BoardState,
  weights: number[],
  continueFrom: Position | null,
  epsilon: number,
): Move | null {
  const moves = getAllLegalMoves(board, "black", continueFrom);
  if (moves.length === 0) return null;

  // Explore: pick a random move with probability epsilon.
  if (Math.random() < epsilon) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  // Sort moves: captures first (better pruning).
  const sortedMoves = sortMoves(moves);

  for (const move of sortedMoves) {
    const next = applyMove(board, move);
    const score = minimax(next, DEPTH - 1, alpha, beta, false, weights);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Move ordering heuristic: prioritize captures and forward moves.
 * This speeds up alpha-beta pruning significantly.
 */
function sortMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const aIsCapture = a.captures.length > 0 ? 1 : 0;
    const bIsCapture = b.captures.length > 0 ? 1 : 0;
    if (aIsCapture !== bIsCapture) {
      return bIsCapture - aIsCapture; // Captures first
    }
    // Tiebreaker: forward moves (lower row difference).
    const aForward = Math.abs(a.to.row - a.from.row);
    const bForward = Math.abs(b.to.row - b.from.row);
    return aForward - bForward;
  });
}

/**
 * Standard minimax with alpha-beta pruning.
 * maximising = true means it is Black's turn (AI).
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  weights: number[],
): number {
  const currentPlayer: Player = maximising ? "black" : "red";
  const winner = getWinner(board, currentPlayer);

  if (winner === "black") return WIN_SCORE;
  if (winner === "red") return -WIN_SCORE;

  if (depth === 0) {
    return evaluate(extractFeatures(board), weights);
  }

  const moves = getAllLegalMoves(board, currentPlayer);
  if (moves.length === 0) {
    return maximising ? -WIN_SCORE : WIN_SCORE;
  }

  // Sort moves for better pruning (especially at root).
  const sortedMoves = sortMoves(moves);

  if (maximising) {
    let best = -Infinity;
    for (const move of sortedMoves) {
      const next = applyMove(board, move);
      const score = minimax(next, depth - 1, alpha, beta, false, weights);
      best = Math.max(best, score);
      const newAlpha = Math.max(alpha, best);
      if (beta <= newAlpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of sortedMoves) {
      const next = applyMove(board, move);
      const score = minimax(next, depth - 1, alpha, beta, true, weights);
      best = Math.min(best, score);
      const newBeta = Math.min(beta, best);
      if (newBeta <= alpha) break;
    }
    return best;
  }
}
