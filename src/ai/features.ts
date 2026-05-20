import {
  applyMove,
  type BoardState,
  type Move,
  type Player,
  getAllLegalMoves,
  getOwner,
  isKing,
  mustContinueJump,
} from "../game/checkers";

export const FEATURE_COUNT = 11;

/**
 * Extracts numeric features describing the board from Black's perspective.
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
  const blackImmediateCaptureValue = immediateCaptureValue(board, "black");
  const redImmediateCaptureValue = immediateCaptureValue(board, "red");
  const blackBestCaptureSequence = bestCaptureSequenceValue(board, "black");
  const redBestCaptureSequence = bestCaptureSequenceValue(board, "red");

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
  f[8] = blackImmediateCaptureValue - redImmediateCaptureValue;
  f[9] = blackBestCaptureSequence - redBestCaptureSequence;
  f[10] = countSafePieces(board, "black") - countSafePieces(board, "red");

  return f;
}

function countCaptures(board: BoardState, player: Player): number {
  return getAllLegalMoves(board, player).filter((m) => m.captures.length > 0)
    .length;
}

function pieceValue(board: BoardState, row: number, col: number): number {
  const piece = board[row][col];
  if (!piece) return 0;
  return isKing(piece) ? 2.5 : 1;
}

function moveCaptureValue(board: BoardState, move: Move): number {
  return move.captures.reduce(
    (total, cap) => total + pieceValue(board, cap.row, cap.col),
    0,
  );
}

function immediateCaptureValue(board: BoardState, player: Player): number {
  return getAllLegalMoves(board, player).reduce(
    (total, move) => total + moveCaptureValue(board, move),
    0,
  );
}

function bestCaptureSequenceValue(
  board: BoardState,
  player: Player,
  continueFrom: Move["to"] | null = null,
): number {
  const moves = getAllLegalMoves(board, player, continueFrom).filter(
    (move) => move.captures.length > 0,
  );
  if (moves.length === 0) return 0;

  let best = 0;
  for (const move of moves) {
    const next = applyMove(board, move);
    const followUp = mustContinueJump(next, move)
      ? bestCaptureSequenceValue(next, player, move.to)
      : 0;
    best = Math.max(best, moveCaptureValue(board, move) + followUp);
  }
  return best;
}

function countSafePieces(board: BoardState, player: Player): number {
  const opponent: Player = player === "black" ? "red" : "black";
  const threatened = new Set<string>();

  for (const move of getAllLegalMoves(board, opponent)) {
    for (const cap of move.captures) {
      threatened.add(`${cap.row},${cap.col}`);
    }
  }

  let safe = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && getOwner(piece) === player && !threatened.has(`${row},${col}`)) {
        safe++;
      }
    }
  }
  return safe;
}
