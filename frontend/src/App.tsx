import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./components/Board";
import { extractFeatures } from "./ai/features";
import { chooseBlackMove, explorationRate } from "./ai/player";
import {
  loadAiState,
  saveAiState,
  tdUpdate,
  type AiState,
} from "./ai/weights";
import {
  applyMove,
  createInitialBoard,
  getAllLegalMoves,
  getLegalMovesForSelection,
  getOwner,
  getWinner,
  mustContinueJump,
  movesEqual,
  type BoardState,
  type Move,
  type Player,
  type Position,
} from "./game/checkers";

type GameStatus = "playing" | "red-wins" | "black-wins";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomFirstPlayer(): Player {
  return Math.random() < 0.5 ? "black" : "red";
}

export default function App() {
  const [aiState, setAiState] = useState<AiState>(() => loadAiState());
  const [aiThinking, setAiThinking] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");

  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [turn, setTurn] = useState<Player>(randomFirstPlayer);
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(null);

  const aiStateRef = useRef<AiState>(aiState);
  const blackFeaturesRef = useRef<Float32Array[]>([]);
  const statusRef = useRef<GameStatus>("playing");
  const aiRunningRef = useRef(false);

  useEffect(() => { aiStateRef.current = aiState; }, [aiState]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const resetSelection = useCallback(() => {
    setSelected(null);
    setLegalMoves([]);
  }, []);

  const finishGame = useCallback((winner: Player) => {
    setStatus(winner === "red" ? "red-wins" : "black-wins");
    setMustContinueFrom(null);
    resetSelection();

    const outcome = winner === "black" ? 1 : -1;
    const features = blackFeaturesRef.current;
    blackFeaturesRef.current = [];

    setAiState((prev) => {
      const newWeights = [...prev.weights];
      tdUpdate(features, outcome, newWeights, prev.gamesPlayed);
      const next: AiState = {
        weights: newWeights,
        gamesPlayed: prev.gamesPlayed + 1,
      };
      saveAiState(next);
      aiStateRef.current = next;
      return next;
    });
  }, [resetSelection]);

  const runAiTurn = useCallback(
    async (startBoard: BoardState, continueFrom: Position | null) => {
      if (statusRef.current !== "playing") return;
      if (aiRunningRef.current) return;

      aiRunningRef.current = true;
      setAiThinking(true);

      let currentBoard = startBoard;
      let cont = continueFrom;

      try {
        while (statusRef.current === "playing") {
          if (getWinner(currentBoard, "black") === "red") {
            finishGame("red");
            return;
          }

          blackFeaturesRef.current.push(extractFeatures(currentBoard));

          const { weights, gamesPlayed } = aiStateRef.current;
          const move = chooseBlackMove(currentBoard, cont, weights, gamesPlayed);

          if (!move) {
            finishGame("red");
            return;
          }

          await delay(450);
          currentBoard = applyMove(currentBoard, move);
          setBoard(currentBoard);

          if (mustContinueJump(currentBoard, move)) {
            cont = move.to;
            setMustContinueFrom(move.to);
            continue;
          }

          setMustContinueFrom(null);

          if (getWinner(currentBoard, "red") === "black") {
            finishGame("black");
            return;
          }

          setTurn("red");
          return;
        }
      } finally {
        aiRunningRef.current = false;
        setAiThinking(false);
      }
    },
    [finishGame],
  );

  const startNewGame = useCallback(() => {
    const fresh = createInitialBoard();
    const first = randomFirstPlayer();
    blackFeaturesRef.current = [];
    setBoard(fresh);
    setTurn(first);
    setStatus("playing");
    statusRef.current = "playing";
    setMustContinueFrom(null);
    resetSelection();
    if (first === "black") void runAiTurn(fresh, null);
  }, [resetSelection, runAiTurn]);

  useEffect(() => {
    setTurn((current) => {
      if (current === "black") void runAiTurn(createInitialBoard(), null);
      return current;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (status !== "playing" || turn !== "red" || aiThinking) return;

      const clicked: Position = { row, col };
      const piece = board[row][col];

      const matchingMove = legalMoves.find((m) => movesEqual(m.to, clicked));
      if (selected && matchingMove) {
        const nextBoard = applyMove(board, matchingMove);
        setBoard(nextBoard);

        if (mustContinueJump(nextBoard, matchingMove)) {
          setMustContinueFrom(matchingMove.to);
          setSelected(matchingMove.to);
          setLegalMoves(
            getLegalMovesForSelection(nextBoard, "red", matchingMove.to, matchingMove.to),
          );
          return;
        }

        setMustContinueFrom(null);
        resetSelection();

        if (getWinner(nextBoard, "black") === "red") {
          finishGame("red");
          return;
        }

        setTurn("black");
        void runAiTurn(nextBoard, null);
        return;
      }

      if (mustContinueFrom) return;

      if (piece && getOwner(piece) === "red") {
        const allMoves = getAllLegalMoves(board, "red");
        if (!allMoves.some((m) => m.from.row === row && m.from.col === col)) return;
        setSelected(clicked);
        setLegalMoves(getLegalMovesForSelection(board, "red", clicked, null));
        return;
      }

      resetSelection();
    },
    [board, turn, status, selected, legalMoves, mustContinueFrom, aiThinking,
      resetSelection, finishGame, runAiTurn],
  );

  const { gamesPlayed } = aiState;

  const statusMessage =
    status === "red-wins"
      ? "You win!"
      : status === "black-wins"
        ? "AI wins!"
        : aiThinking
          ? "AI is thinking…"
          : turn === "red"
            ? "Your turn (Red)"
            : "AI is moving (Black)";

  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col items-center justify-center gap-3 bg-neutral-100 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Checkers vs AI</h1>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600 sm:text-sm">
          You play Red · AI plays Black
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          Games played: {gamesPlayed}
          <span className="ml-2 opacity-60">
            · Exploration: {(explorationRate(gamesPlayed) * 100).toFixed(0)}%
          </span>
        </p>
      </div>

      <div className="w-full max-w-md">
        <Board
          board={board}
          turn={turn}
          selected={selected}
          legalMoves={legalMoves}
          mustContinueFrom={mustContinueFrom}
          onSquareClick={handleSquareClick}
          interactive={turn === "red" && status === "playing" && !aiThinking}
          statusMessage={statusMessage}
        />
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
        <button
          type="button"
          onClick={startNewGame}
          disabled={aiThinking}
          className="min-h-11 w-full max-w-xs rounded-lg bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white active:bg-neutral-600 disabled:opacity-50 sm:w-auto sm:hover:bg-neutral-700"
        >
          New game
        </button>
      </div>
    </div>
  );
}
