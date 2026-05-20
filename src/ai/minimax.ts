import {
  applyMove,
  getAllLegalMoves,
  getOpponent,
  getWinner,
  mustContinueJump,
  type BoardState,
  type Move,
  type Player,
  type Position,
} from "../game/checkers";
import { evaluateBoard } from "./evaluation";
import { orderMoves } from "./moveOrdering";

const WIN_SCORE = 1_000_000;
const MAX_TRANSPOSITION_ENTRIES = 100_000;

type Bound = "exact" | "lower" | "upper";

interface TranspositionEntry {
  score: number;
  depth: number;
  bound: Bound;
}

export interface SearchStats {
  nodes: number;
  leaves: number;
  prunes: number;
  transpositionHits: number;
  score: number;
}

export interface SearchOptions {
  depth: number;
  aiPlayer?: Player;
  continueFrom?: Position | null;
  debug?: boolean;
}

export interface BestMoveResult {
  move: Move | null;
  score: number;
  stats: SearchStats;
}

const transpositionTable = new Map<string, TranspositionEntry>();

export function getBestMove(
  board: BoardState,
  playerToMove: Player,
  options: SearchOptions,
): BestMoveResult {
  const aiPlayer = options.aiPlayer ?? playerToMove;
  const continueFrom = options.continueFrom ?? null;
  const depth = Math.max(1, options.depth);
  const stats = createStats();
  let alpha = -Infinity;
  const beta = Infinity;
  let bestMove: Move | null = null;
  let bestScore = playerToMove === aiPlayer ? -Infinity : Infinity;

  transpositionTable.clear();

  const moves = orderMoves(board, getAllLegalMoves(board, playerToMove, continueFrom), playerToMove);
  if (moves.length === 0) {
    const winner = getOpponent(playerToMove);
    const score = terminalScore(winner, aiPlayer, depth);
    return { move: null, score, stats: { ...stats, score } };
  }

  for (const move of moves) {
    const next = applyMove(board, move);
    const mustContinue = mustContinueJump(next, move);
    const nextPlayer = mustContinue ? playerToMove : getOpponent(playerToMove);
    const score = minimax(
      next,
      mustContinue ? depth : depth - 1,
      alpha,
      beta,
      nextPlayer,
      aiPlayer,
      mustContinue ? move.to : null,
      stats,
    );

    if (isBetterScore(score, bestScore, playerToMove === aiPlayer)) {
      bestScore = score;
      bestMove = move;
    }

    if (playerToMove === aiPlayer) {
      alpha = Math.max(alpha, bestScore);
    }
  }

  stats.score = bestScore;
  if (options.debug) {
    console.debug("AI search", { playerToMove, depth, bestScore, stats });
  }

  return { move: bestMove, score: bestScore, stats };
}

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  playerToMove: Player,
  aiPlayer: Player,
  continueFrom: Position | null,
  stats: SearchStats,
): number {
  stats.nodes++;

  const winner = getWinner(board, playerToMove);
  if (winner) {
    stats.leaves++;
    return terminalScore(winner, aiPlayer, depth);
  }

  if (depth <= 0) {
    stats.leaves++;
    return evaluateBoard(board, aiPlayer);
  }

  const cacheKey = hashBoard(board, playerToMove, continueFrom);
  const cached = transpositionTable.get(cacheKey);
  if (cached && cached.depth >= depth) {
    stats.transpositionHits++;
    if (cached.bound === "exact") return cached.score;
    if (cached.bound === "lower") alpha = Math.max(alpha, cached.score);
    if (cached.bound === "upper") beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const originalAlpha = alpha;
  const originalBeta = beta;
  const moves = orderMoves(board, getAllLegalMoves(board, playerToMove, continueFrom), playerToMove);

  if (moves.length === 0) {
    stats.leaves++;
    return terminalScore(getOpponent(playerToMove), aiPlayer, depth);
  }

  const maximizing = playerToMove === aiPlayer;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = applyMove(board, move);
    const mustContinue = mustContinueJump(next, move);
    const nextPlayer = mustContinue ? playerToMove : getOpponent(playerToMove);
    const score = minimax(
      next,
      mustContinue ? depth : depth - 1,
      alpha,
      beta,
      nextPlayer,
      aiPlayer,
      mustContinue ? move.to : null,
      stats,
    );

    if (maximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }

    if (alpha >= beta) {
      stats.prunes++;
      break;
    }
  }

  remember(cacheKey, {
    score: bestScore,
    depth,
    bound: getBound(bestScore, originalAlpha, originalBeta),
  });

  return bestScore;
}

function createStats(): SearchStats {
  return {
    nodes: 0,
    leaves: 0,
    prunes: 0,
    transpositionHits: 0,
    score: 0,
  };
}

function isBetterScore(score: number, bestScore: number, maximizing: boolean): boolean {
  return maximizing ? score > bestScore : score < bestScore;
}

function terminalScore(winner: Player, aiPlayer: Player, depth: number): number {
  const score = WIN_SCORE + depth;
  return winner === aiPlayer ? score : -score;
}

function getBound(score: number, originalAlpha: number, originalBeta: number): Bound {
  if (score <= originalAlpha) return "upper";
  if (score >= originalBeta) return "lower";
  return "exact";
}

function remember(key: string, entry: TranspositionEntry): void {
  if (transpositionTable.size >= MAX_TRANSPOSITION_ENTRIES) {
    transpositionTable.clear();
  }
  transpositionTable.set(key, entry);
}

function hashBoard(
  board: BoardState,
  playerToMove: Player,
  continueFrom: Position | null,
): string {
  let hash = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
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

  return `${hash}|${playerToMove}|${continueFrom?.row ?? "-"},${continueFrom?.col ?? "-"}`;
}
