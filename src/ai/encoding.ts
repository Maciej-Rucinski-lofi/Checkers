import type { BoardState, Piece } from "../game/checkers";
import { isDarkSquare } from "../game/checkers";

/** One-hot features for 32 playable squares (4 piece types per square). */
export const INPUT_SIZE = 128;

const PIECE_INDEX: Record<Piece, number> = {
  black: 0,
  "black-king": 1,
  red: 2,
  "red-king": 3,
};

/** Fixed order over dark squares, from Black's perspective (row 0 = top). */
export function encodeBoard(board: BoardState): Float32Array {
  const features = new Float32Array(INPUT_SIZE);
  let square = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDarkSquare(row, col)) continue;

      const piece = board[row][col];
      if (piece) {
        const offset = square * 4 + PIECE_INDEX[piece];
        features[offset] = 1;
      }
      square++;
    }
  }

  return features;
}

export function serializeState(state: Float32Array): number[] {
  return Array.from(state);
}

export function deserializeState(data: number[]): Float32Array {
  return new Float32Array(data);
}
