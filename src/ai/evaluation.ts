import {
  getAllLegalMoves,
  getOpponent,
  getOwner,
  isKing,
  type BoardState,
  type Move,
  type Piece,
  type Player,
} from "../game/checkers";

export interface EvaluationWeights {
  man: number;
  king: number;
  mobility: number;
  advancement: number;
  centerControl: number;
  backRowGuard: number;
  captureThreat: number;
  safety: number;
}

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  man: 100,
  king: 300,
  mobility: 6,
  advancement: 7,
  centerControl: 12,
  backRowGuard: 8,
  captureThreat: 35,
  safety: 18,
};

export function pieceValue(piece: Piece): number {
  return isKing(piece) ? DEFAULT_EVALUATION_WEIGHTS.king : DEFAULT_EVALUATION_WEIGHTS.man;
}

export function evaluateBoard(
  board: BoardState,
  perspective: Player,
  weights: EvaluationWeights = DEFAULT_EVALUATION_WEIGHTS,
): number {
  const opponent = getOpponent(perspective);
  const perspectiveMoves = getAllLegalMoves(board, perspective);
  const opponentMoves = getAllLegalMoves(board, opponent);

  return (
    scorePlayer(board, perspective, perspectiveMoves, opponentMoves, weights) -
    scorePlayer(board, opponent, opponentMoves, perspectiveMoves, weights)
  );
}

function scorePlayer(
  board: BoardState,
  player: Player,
  moves: Move[],
  opponentMoves: Move[],
  weights: EvaluationWeights,
): number {
  const threatenedSquares = new Set(
    opponentMoves.flatMap((move) => move.captures.map((capture) => `${capture.row},${capture.col}`)),
  );

  let material = 0;
  let advancement = 0;
  let centerControl = 0;
  let backRowGuard = 0;
  let safety = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || getOwner(piece) !== player) continue;

      const king = isKing(piece);
      material += king ? weights.king : weights.man;

      if (!king) {
        advancement += player === "black" ? row : 7 - row;
        if ((player === "black" && row === 0) || (player === "red" && row === 7)) {
          backRowGuard++;
        }
      }

      if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
        centerControl++;
      }

      const value = king ? weights.king : weights.man;
      safety += threatenedSquares.has(`${row},${col}`) ? -value / weights.man : 1;
    }
  }

  return (
    material +
    moves.length * weights.mobility +
    advancement * weights.advancement +
    centerControl * weights.centerControl +
    backRowGuard * weights.backRowGuard +
    capturePotential(board, moves) * weights.captureThreat +
    safety * weights.safety
  );
}

function capturePotential(board: BoardState, moves: Move[]): number {
  return moves.reduce((total, move) => {
    const capturedValue = move.captures.reduce((sum, capture) => {
      const capturedPiece = board[capture.row][capture.col];
      return capturedPiece ? sum + pieceValue(capturedPiece) / DEFAULT_EVALUATION_WEIGHTS.man : sum;
    }, 0);

    return total + capturedValue;
  }, 0);
}
