import { type BoardState, type Move, type Position } from "../game/checkers";
import { bestBlackMove } from "./minimax";
import { explorationRate } from "./weights";

export { explorationRate };

export function chooseBlackMove(
  board: BoardState,
  continueFrom: Position | null,
  weights: number[],
  gamesPlayed: number,
): Move | null {
  return bestBlackMove(
    board,
    weights,
    continueFrom,
    explorationRate(gamesPlayed),
  );
}
