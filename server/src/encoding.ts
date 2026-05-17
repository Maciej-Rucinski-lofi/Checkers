export const INPUT_SIZE = 128;

type Piece = "black" | "black-king" | "red" | "red-king";

const PIECE_INDEX: Record<Piece, number> = {
  black: 0,
  "black-king": 1,
  red: 2,
  "red-king": 3,
};

function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

type BoardState = (Piece | null)[][];

export function encodeBoard(board: BoardState): number[] {
  const features = new Array<number>(INPUT_SIZE).fill(0);
  let square = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDarkSquare(row, col)) continue;
      const piece = board[row][col];
      if (piece) {
        features[square * 4 + PIECE_INDEX[piece]] = 1;
      }
      square++;
    }
  }

  return features;
}
