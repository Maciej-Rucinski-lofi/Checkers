import { type BoardState, type Move, type Position } from "../game/checkers";
import { chooseBlackMove as chooseConfiguredBlackMove, type AiDifficulty } from "./aiPlayer";

export type { AiDifficulty };

export function chooseBlackMove(
  board: BoardState,
  continueFrom: Position | null,
  difficulty: AiDifficulty = "medium",
): Move | null {
  return chooseConfiguredBlackMove(board, continueFrom, difficulty);
}
