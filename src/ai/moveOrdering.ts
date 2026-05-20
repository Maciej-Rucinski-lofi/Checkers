import {
  getOwner,
  isKing,
  type BoardState,
  type Move,
  type Player,
} from "../game/checkers";
import { pieceValue } from "./evaluation";

export function orderMoves(board: BoardState, moves: Move[], player: Player): Move[] {
  return [...moves].sort((a, b) => moveScore(board, b, player) - moveScore(board, a, player));
}

function moveScore(board: BoardState, move: Move, player: Player): number {
  const movingPiece = board[move.from.row][move.from.col];
  if (!movingPiece || getOwner(movingPiece) !== player) return -Infinity;

  const captureScore = move.captures.reduce((total, capture) => {
    const capturedPiece = board[capture.row][capture.col];
    return capturedPiece ? total + pieceValue(capturedPiece) : total;
  }, 0);

  const promotionScore =
    !isKing(movingPiece) &&
    ((player === "black" && move.to.row === 7) || (player === "red" && move.to.row === 0))
      ? 80
      : 0;

  const kingMoveScore = isKing(movingPiece) ? 20 : 0;
  const centerScore = move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5 ? 8 : 0;

  // Captures first gives alpha-beta the best chance to prune tactical branches early.
  return captureScore * 10 + promotionScore + kingMoveScore + centerScore;
}
