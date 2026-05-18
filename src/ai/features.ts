import {
  type BoardState,
  type Player,
  getAllLegalMoves,
  getOwner,
  isKing,
} from "../game/checkers";

export const FEATURE_COUNT = 8;

/**
 * Extracts 8 numeric features describing the board from Black's perspective.
 * Positive values favour Black (AI), negative values favour Red (human).
 */
export function extractFeatures(board: BoardState): Float32Array {
  const f = new Float32Array(FEATURE_COUNT);

  let blackPieces = 0;
  let redPieces = 0;
  let blackKings = 0;
  let redKings = 0;
  let blackAdvancement = 0;
  let redAdvancement = 0;
  let blackCenter = 0;
  let redCenter = 0;
  let blackBackRow = 0;
  let redBackRow = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const owner = getOwner(piece)!;
      const king = isKing(piece);
      const inCenter =
        row >= 2 && row <= 5 && col >= 2 && col <= 5;

      if (owner === "black") {
        blackPieces++;
        if (king) blackKings++;
        blackAdvancement += row;
        if (inCenter) blackCenter++;
        if (row === 0) blackBackRow++;
      } else {
        redPieces++;
        if (king) redKings++;
        redAdvancement += 7 - row;
        if (inCenter) redCenter++;
        if (row === 7) redBackRow++;
      }
    }
  }

  const blackMobility = getAllLegalMoves(board, "black").length;
  const redMobility = getAllLegalMoves(board, "red").length;

  const blackCaptures = countCaptures(board, "black");
  const redCaptures = countCaptures(board, "red");

  const pieceDiff = blackPieces - redPieces;
  const tradeBonus =
    pieceDiff > 0
      ? -0.5
      : pieceDiff < 0
        ? 0.5
        : 0;

  f[0] = blackPieces - redPieces;
  f[1] = (blackKings - redKings) * 1.5;
  f[2] = (blackAdvancement - redAdvancement) / 7;
  f[3] = blackCenter - redCenter;
  f[4] = blackBackRow - redBackRow;
  f[5] = blackMobility - redMobility;
  f[6] = blackCaptures - redCaptures;
  f[7] = tradeBonus;

  return f;
}

function countCaptures(board: BoardState, player: Player): number {
  return getAllLegalMoves(board, player).filter((m) => m.captures.length > 0)
    .length;
}
