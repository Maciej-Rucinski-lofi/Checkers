import {
  applyMove,
  getAllLegalMoves,
  getWinner,
  mustContinueJump,
  type BoardState,
  type Move,
  type Player,
  type Position,
} from "../game/checkers";
import { extractFeatures } from "./features";
import { evaluate } from "./weights";

// Expert-level search depth: looks 7 plies ahead.
// Forced multi-jumps do not hand the turn to the opponent, so tactical chains are searched correctly.
// Transposition table caching makes this practical despite the exponential growth.
const DEPTH = 7;
const WIN_SCORE = 1000;

// Transposition table: cache evaluated positions to avoid re-evaluation
// Uses board hash as key for fast lookup
type TranspositionEntry = { score: number; depth: number; flag: 'exact' | 'lower' | 'upper' };
let transpositionTable: Map<string, TranspositionEntry> = new Map();

/**
 * Simple board hash for transposition table lookups.
 * Converts board state to a compact string for caching.
 */
function hashBoard(
  board: BoardState,
  maximising: boolean,
  continueFrom: Position | null,
): string {
  let hash = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      hash += piece === "black"
        ? "b"
        : piece === "black-king"
          ? "B"
          : piece === "red"
            ? "r"
            : piece === "red-king"
              ? "R"
              : ".";
    }
  }
  return `${hash}|${maximising ? "b" : "r"}|${continueFrom?.row ?? "-"},${continueFrom?.col ?? "-"}`;
}

/**
 * Picks the best move for Black using alpha-beta minimax with move ordering and transposition table.
 * Returns null if no moves are available (Black has lost).
 */
export function bestBlackMove(
  board: BoardState,
  weights: number[],
  continueFrom: Position | null,
  epsilon: number,
): Move | null {
  // Clear transposition table for each new move decision
  transpositionTable.clear();

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
    const mustContinue = mustContinueJump(next, move);
    const score = minimax(
      next,
      mustContinue ? DEPTH : DEPTH - 1,
      alpha,
      beta,
      mustContinue,
      weights,
      mustContinue ? move.to : null,
    );
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
 * Standard minimax with alpha-beta pruning and transposition table.
 * maximising = true means it is Black's turn (AI).
 * Cached positions are reused to dramatically speed up deep search.
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  weights: number[],
  continueFrom: Position | null = null,
): number {
  const originalAlpha = alpha;
  const originalBeta = beta;
  const boardHash = hashBoard(board, maximising, continueFrom);

  // Check transposition table for cached evaluation
  const cached = transpositionTable.get(boardHash);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'exact') return cached.score;
    if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score);
    if (cached.flag === 'upper') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const currentPlayer: Player = maximising ? "black" : "red";
  const winner = getWinner(board, currentPlayer);

  if (winner === "black") return WIN_SCORE;
  if (winner === "red") return -WIN_SCORE;

  if (depth === 0) {
    return evaluate(extractFeatures(board), weights);
  }

  const moves = getAllLegalMoves(board, currentPlayer, continueFrom);
  if (moves.length === 0) {
    return maximising ? -WIN_SCORE : WIN_SCORE;
  }

  // Sort moves for better pruning (especially at root).
  const sortedMoves = sortMoves(moves);

  let score: number;
  if (maximising) {
    let best = -Infinity;
    for (const move of sortedMoves) {
      const next = applyMove(board, move);
      const mustContinue = mustContinueJump(next, move);
      const evalScore = minimax(
        next,
        mustContinue ? depth : depth - 1,
        alpha,
        beta,
        mustContinue,
        weights,
        mustContinue ? move.to : null,
      );
      best = Math.max(best, evalScore);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    score = best;
  } else {
    let best = Infinity;
    for (const move of sortedMoves) {
      const next = applyMove(board, move);
      const mustContinue = mustContinueJump(next, move);
      const evalScore = minimax(
        next,
        mustContinue ? depth : depth - 1,
        alpha,
        beta,
        !mustContinue,
        weights,
        mustContinue ? move.to : null,
      );
      best = Math.min(best, evalScore);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    score = best;
  }

  // Store in transposition table with appropriate flag
  let flag: 'exact' | 'lower' | 'upper';
  if (score <= originalAlpha) {
    flag = 'upper';
  } else if (score >= originalBeta) {
    flag = 'lower';
  } else {
    flag = 'exact';
  }

  transpositionTable.set(boardHash, { score, depth, flag });
  return score;
}
