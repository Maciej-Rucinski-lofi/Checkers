import { type BoardState, type Move, type Player, type Position } from "../game/checkers";
import { getBestMove, type BestMoveResult } from "./minimax";

export type AiDifficulty = "easy" | "medium" | "hard";

export interface AiPlayerConfig {
  player: Player;
  difficulty: AiDifficulty;
  debug?: boolean;
}

export const AI_DEPTH_BY_DIFFICULTY: Record<AiDifficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
};

export function chooseAiMove(
  board: BoardState,
  continueFrom: Position | null,
  config: AiPlayerConfig,
): BestMoveResult {
  return getBestMove(board, config.player, {
    aiPlayer: config.player,
    continueFrom,
    depth: AI_DEPTH_BY_DIFFICULTY[config.difficulty],
    debug: config.debug,
  });
}

export function chooseAiMoveAsync(
  board: BoardState,
  continueFrom: Position | null,
  config: AiPlayerConfig,
): Promise<BestMoveResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(chooseAiMove(board, continueFrom, config)), 0);
  });
}

export function chooseBlackMove(
  board: BoardState,
  continueFrom: Position | null,
  difficulty: AiDifficulty,
): Move | null {
  return chooseAiMove(board, continueFrom, { player: "black", difficulty }).move;
}
