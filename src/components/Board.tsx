import type { BoardState, Move, Piece, Player, Position } from "../game/checkers";
import { movesEqual, posKey } from "../game/checkers";

export type { BoardState, Piece };

export interface BoardProps {
  board: BoardState;
  turn: Player;
  selected: Position | null;
  legalMoves: Move[];
  mustContinueFrom: Position | null;
  onSquareClick: (row: number, col: number) => void;
  interactive: boolean;
  statusMessage: string;
}

const PIECE_STYLES: Record<Piece, string> = {
  red: "bg-red-500",
  black: "bg-neutral-900",
  "red-king": "bg-red-500",
  "black-king": "bg-neutral-900",
};

function isKingPiece(piece: Piece): boolean {
  return piece === "red-king" || piece === "black-king";
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 18h16v2H4v-2zm1.5-9 2.2 3.8L12 8.5l4.3 4.3L18.5 9 20 16H4l1.5-7zM12 2l2 4.5L12 9 10 6.5 12 2z" />
    </svg>
  );
}

export default function Board({
  board,
  turn,
  selected,
  legalMoves,
  mustContinueFrom,
  onSquareClick,
  interactive,
  statusMessage,
}: BoardProps) {
  const targetKeys = new Set(legalMoves.map((m) => posKey(m.to)));

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-2 sm:gap-4">
      <p className="max-w-full px-2 text-center text-xs font-medium text-neutral-700 sm:text-sm">
        {statusMessage}
      </p>
      {mustContinueFrom && turn === "red" && (
        <p className="text-xs text-amber-700">Continue your jump</p>
      )}
      <div
        className={`grid w-full max-w-[min(100%,28rem)] grid-cols-8 border-2 border-neutral-800 shadow-lg touch-manipulation sm:max-w-md sm:border-4 ${
          !interactive ? "opacity-95" : ""
        }`}
        role="grid"
        aria-label="Checkers board"
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const pos = { row: rowIndex, col: colIndex };
            const isSelected =
              selected !== null && movesEqual(selected, pos);
            const isContinuePiece =
              mustContinueFrom !== null && movesEqual(mustContinueFrom, pos);
            const isTarget = targetKeys.has(posKey(pos));
            const canClick = isDark && interactive;

            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                role="gridcell"
                disabled={!canClick}
                onClick={() => canClick && onSquareClick(rowIndex, colIndex)}
                aria-label={
                  cell
                    ? `${cell} at ${rowIndex + 1},${colIndex + 1}`
                    : `empty square ${rowIndex + 1},${colIndex + 1}`
                }
                className={`relative flex aspect-square w-full items-center justify-center transition-colors ${
                  !isDark
                    ? "cursor-default bg-amber-100"
                    : canClick
                      ? `cursor-pointer bg-amber-800 active:bg-amber-600 sm:hover:bg-amber-700 ${
                          isSelected || isContinuePiece
                            ? "ring-2 ring-inset ring-yellow-300 sm:ring-4"
                            : ""
                        } ${isTarget ? "bg-amber-600" : ""}`
                      : "cursor-default bg-amber-800"
                }`}
              >
                {isTarget && !cell && (
                  <span className="h-[28%] w-[28%] min-h-2 min-w-2 rounded-full bg-green-400/80 ring-1 ring-green-200 sm:ring-2" />
                )}
                {cell && (
                  <span
                    className={`pointer-events-none relative flex h-[72%] w-[72%] items-center justify-center rounded-full shadow-md ${PIECE_STYLES[cell]}`}
                  >
                    {isKingPiece(cell) && (
                      <CrownIcon
                        className={`h-[58%] w-[58%] ${
                          cell === "red-king"
                            ? "text-amber-200"
                            : "text-amber-400"
                        }`}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
