export type Piece = "red" | "black" | "red-king" | "black-king";
export type Player = "red" | "black";
export type BoardState = (Piece | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures: Position[];
}

const DIRECTIONS: Position[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

export function getOwner(piece: Piece | null): Player | null {
  if (!piece) return null;
  return piece.startsWith("red") ? "red" : "black";
}

export function isKing(piece: Piece): boolean {
  return piece.endsWith("-king");
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => [...row]);
}

function forwardDirections(player: Player): Position[] {
  return player === "black"
    ? [
        { row: 1, col: -1 },
        { row: 1, col: 1 },
      ]
    : [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
      ];
}

export function createInitialBoard(): BoardState {
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      if (!isDarkSquare(row, col)) return null;
      if (row < 3) return "black";
      if (row > 4) return "red";
      return null;
    }),
  );
}

function getManSimpleMoves(
  board: BoardState,
  from: Position,
  piece: Piece,
): Move[] {
  const player = getOwner(piece)!;
  const moves: Move[] = [];

  for (const { row: dr, col: dc } of forwardDirections(player)) {
    const to = { row: from.row + dr, col: from.col + dc };
    if (
      inBounds(to.row, to.col) &&
      isDarkSquare(to.row, to.col) &&
      board[to.row][to.col] === null
    ) {
      moves.push({ from, to, captures: [] });
    }
  }

  return moves;
}

/** Kings slide any distance along open diagonals (flying king). */
function getKingSimpleMoves(board: BoardState, from: Position): Move[] {
  const moves: Move[] = [];

  for (const { row: dr, col: dc } of DIRECTIONS) {
    let row = from.row + dr;
    let col = from.col + dc;

    while (
      inBounds(row, col) &&
      isDarkSquare(row, col) &&
      board[row][col] === null
    ) {
      moves.push({ from, to: { row, col }, captures: [] });
      row += dr;
      col += dc;
    }
  }

  return moves;
}

function getManCaptureMoves(
  board: BoardState,
  from: Position,
  piece: Piece,
): Move[] {
  const player = getOwner(piece)!;
  const moves: Move[] = [];

  for (const { row: dr, col: dc } of DIRECTIONS) {
    const mid = { row: from.row + dr, col: from.col + dc };
    const to = { row: from.row + dr * 2, col: from.col + dc * 2 };

    if (!inBounds(to.row, to.col) || !isDarkSquare(to.row, to.col)) continue;

    const midPiece = board[mid.row][mid.col];
    if (
      midPiece &&
      getOwner(midPiece) !== player &&
      board[to.row][to.col] === null
    ) {
      moves.push({ from, to, captures: [mid] });
    }
  }

  return moves;
}

/** Kings may jump an opponent and land on any empty square beyond on that diagonal. */
function getKingCaptureMoves(
  board: BoardState,
  from: Position,
  piece: Piece,
): Move[] {
  const player = getOwner(piece)!;
  const moves: Move[] = [];

  for (const { row: dr, col: dc } of DIRECTIONS) {
    let row = from.row + dr;
    let col = from.col + dc;

    while (
      inBounds(row, col) &&
      isDarkSquare(row, col) &&
      board[row][col] === null
    ) {
      row += dr;
      col += dc;
    }

    if (!inBounds(row, col) || !isDarkSquare(row, col)) continue;

    const jumped = board[row][col];
    if (!jumped || getOwner(jumped) === player) continue;

    const captured = { row, col };
    row += dr;
    col += dc;

    while (
      inBounds(row, col) &&
      isDarkSquare(row, col) &&
      board[row][col] === null
    ) {
      moves.push({ from, to: { row, col }, captures: [captured] });
      row += dr;
      col += dc;
    }
  }

  return moves;
}

function getSimpleMovesForPiece(
  board: BoardState,
  from: Position,
  piece: Piece,
): Move[] {
  return isKing(piece)
    ? getKingSimpleMoves(board, from)
    : getManSimpleMoves(board, from, piece);
}

function getCaptureMovesForPiece(
  board: BoardState,
  from: Position,
  piece: Piece,
): Move[] {
  return isKing(piece)
    ? getKingCaptureMoves(board, from, piece)
    : getManCaptureMoves(board, from, piece);
}

export function getMovesForPiece(
  board: BoardState,
  from: Position,
  capturesOnly: boolean,
): Move[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const captures = getCaptureMovesForPiece(board, from, piece);
  if (captures.length > 0) return captures;
  if (capturesOnly) return [];

  return getSimpleMovesForPiece(board, from, piece);
}

export function getAllLegalMoves(
  board: BoardState,
  player: Player,
  continueFrom: Position | null = null,
): Move[] {
  const positions: Position[] = continueFrom
    ? [continueFrom]
    : [];

  if (!continueFrom) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && getOwner(piece) === player) {
          positions.push({ row, col });
        }
      }
    }
  }

  const captureMoves: Move[] = [];
  const simpleMoves: Move[] = [];

  for (const from of positions) {
    const piece = board[from.row][from.col];
    if (!piece || getOwner(piece) !== player) continue;

    const captures = getCaptureMovesForPiece(board, from, piece);
    captureMoves.push(...captures);

    if (captures.length === 0 && !continueFrom) {
      simpleMoves.push(...getSimpleMovesForPiece(board, from, piece));
    }
  }

  return captureMoves.length > 0 ? captureMoves : simpleMoves;
}

export function getLegalMovesForSelection(
  board: BoardState,
  player: Player,
  from: Position,
  continueFrom: Position | null,
): Move[] {
  const allMoves = getAllLegalMoves(board, player, continueFrom);
  const mustCapture = allMoves.some((m) => m.captures.length > 0);

  return allMoves.filter(
    (m) =>
      m.from.row === from.row &&
      m.from.col === from.col &&
      (!mustCapture || m.captures.length > 0),
  );
}

function promoteIfNeeded(piece: Piece, row: number): Piece {
  if (isKing(piece)) return piece;
  if (piece === "red" && row === 0) return "red-king";
  if (piece === "black" && row === 7) return "black-king";
  return piece;
}

export function applyMove(board: BoardState, move: Move): BoardState {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col]!;

  next[move.from.row][move.from.col] = null;
  next[move.to.row][move.to.col] = promoteIfNeeded(piece, move.to.row);

  for (const cap of move.captures) {
    next[cap.row][cap.col] = null;
  }

  return next;
}

export function mustContinueJump(board: BoardState, move: Move): boolean {
  if (move.captures.length === 0) return false;
  const followUps = getCaptureMovesForPiece(
    board,
    move.to,
    board[move.to.row][move.to.col]!,
  );
  return followUps.length > 0;
}

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function movesEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getOpponent(player: Player): Player {
  return player === "red" ? "black" : "red";
}

export function countPieces(board: BoardState, player: Player): number {
  let count = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (getOwner(board[row][col]) === player) count++;
    }
  }
  return count;
}

/** Returns the winner if the player to move cannot continue, otherwise null. */
export function getWinner(
  board: BoardState,
  playerToMove: Player,
): Player | null {
  if (countPieces(board, playerToMove) === 0) {
    return getOpponent(playerToMove);
  }
  if (getAllLegalMoves(board, playerToMove).length === 0) {
    return getOpponent(playerToMove);
  }
  return null;
}
