import type * as tf from "@tensorflow/tfjs";
import {
  applyMove,
  getAllLegalMoves,
  type BoardState,
  type Move,
  type Position,
} from "../game/checkers";
import { encodeBoard } from "./encoding";
import { evaluateBoard } from "./model";

export function explorationRate(gamesPlayed: number): number {
  return Math.max(0.05, 0.35 - gamesPlayed * 0.008);
}

export async function chooseBlackMove(
  model: tf.LayersModel,
  board: BoardState,
  continueFrom: Position | null,
  epsilon: number,
): Promise<Move | null> {
  const moves = getAllLegalMoves(board, "black", continueFrom);
  if (moves.length === 0) return null;

  if (Math.random() < epsilon) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const nextBoard = applyMove(board, move);
    const score = await evaluateBoard(model, encodeBoard(nextBoard));
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
