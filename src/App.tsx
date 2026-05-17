import type * as tf from "@tensorflow/tfjs";
import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./components/Board";
import { encodeBoard } from "./ai/encoding";
import {
  incrementGamesPlayed,
  loadExperiences,
  loadGamesPlayed,
  saveExperiences,
  type GameExperience,
} from "./ai/experience";
import { loadOrCreateModel } from "./ai/model";
import { chooseBlackMove, explorationRate } from "./ai/player";
import { trainOnExperiences } from "./ai/trainer";
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

export default function App() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");

  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [turn, setTurn] = useState<Player>("black");
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(
    null,
  );

  const modelRef = useRef<tf.LayersModel | null>(null);
  const experiencesRef = useRef<GameExperience[]>([]);
  const blackStatesRef = useRef<Float32Array[]>([]);
  const gamesPlayedRef = useRef(0);
  const statusRef = useRef<GameStatus>("playing");
  const aiRunningRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    gamesPlayedRef.current = gamesPlayed;
  }, [gamesPlayed]);

  const resetSelection = useCallback(() => {
    setSelected(null);
    setLegalMoves([]);
  }, []);

  const finishGame = useCallback(async (winner: Player) => {
    setStatus(winner === "red" ? "red-wins" : "black-wins");
    setMustContinueFrom(null);
    resetSelection();

    const outcome = winner === "black" ? 1 : -1;
    const states = blackStatesRef.current;
    blackStatesRef.current = [];

    if (states.length === 0 || !modelRef.current) return;

    const newExperience: GameExperience = { states, outcome };
    const allExperiences = [...experiencesRef.current, newExperience];
    experiencesRef.current = allExperiences;
    saveExperiences(allExperiences);

    setIsTraining(true);
    try {
      await trainOnExperiences(modelRef.current, allExperiences);
    } finally {
      setIsTraining(false);
    }

    const count = incrementGamesPlayed();
    gamesPlayedRef.current = count;
    setGamesPlayed(count);
  }, [resetSelection]);

  const runAiTurn = useCallback(
    async (startBoard: BoardState, continueFrom: Position | null) => {
      if (!modelRef.current || statusRef.current !== "playing") return;
      if (aiRunningRef.current) return;

      aiRunningRef.current = true;
      setAiThinking(true);

      let currentBoard = startBoard;
      let cont = continueFrom;

      try {
        while (statusRef.current === "playing") {
          const winnerBeforeMove = getWinner(currentBoard, "black");
          if (winnerBeforeMove === "red") {
            await finishGame("red");
            return;
          }

          blackStatesRef.current.push(encodeBoard(currentBoard));

          const move = await chooseBlackMove(
            modelRef.current,
            currentBoard,
            cont,
            explorationRate(gamesPlayedRef.current),
          );

          if (!move) {
            await finishGame("red");
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

          const winnerAfterMove = getWinner(currentBoard, "red");
          if (winnerAfterMove === "black") {
            await finishGame("black");
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
    blackStatesRef.current = [];
    setBoard(fresh);
    setTurn("black");
    setStatus("playing");
    statusRef.current = "playing";
    setMustContinueFrom(null);
    resetSelection();
    void runAiTurn(fresh, null);
  }, [resetSelection, runAiTurn]);

  useEffect(() => {
    void (async () => {
      const loadedModel = await loadOrCreateModel();
      modelRef.current = loadedModel;
      setModel(loadedModel);
      setModelReady(true);

      const experiences = loadExperiences();
      experiencesRef.current = experiences;
      setGamesPlayed(loadGamesPlayed());

      void runAiTurn(createInitialBoard(), null);
    })();
  }, [runAiTurn]);

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (
        status !== "playing" ||
        turn !== "red" ||
        aiThinking ||
        isTraining
      ) {
        return;
      }

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
            getLegalMovesForSelection(
              nextBoard,
              "red",
              matchingMove.to,
              matchingMove.to,
            ),
          );
          return;
        }

        setMustContinueFrom(null);
        resetSelection();

        const winner = getWinner(nextBoard, "black");
        if (winner === "red") {
          void finishGame("red");
          return;
        }

        setTurn("black");
        void runAiTurn(nextBoard, null);
        return;
      }

      if (mustContinueFrom) return;

      if (piece && getOwner(piece) === "red") {
        const allMoves = getAllLegalMoves(board, "red");
        const pieceHasMove = allMoves.some(
          (m) => m.from.row === row && m.from.col === col,
        );
        if (!pieceHasMove) return;

        setSelected(clicked);
        setLegalMoves(getLegalMovesForSelection(board, "red", clicked, null));
        return;
      }

      resetSelection();
    },
    [
      board,
      turn,
      status,
      selected,
      legalMoves,
      mustContinueFrom,
      aiThinking,
      isTraining,
      resetSelection,
      finishGame,
      runAiTurn,
    ],
  );

  const statusMessage =
    status === "red-wins"
      ? "You win! The AI is learning from this game."
      : status === "black-wins"
        ? "AI wins! It learned from this game."
        : aiThinking
          ? "AI is thinking…"
          : isTraining
            ? "Training neural network…"
            : turn === "red"
              ? "Your turn (Red)"
              : "AI is moving (Black)";

  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col items-center justify-center gap-3 bg-neutral-100 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
          Checkers vs AI
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600 sm:text-sm">
          You play Red · AI plays Black
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          Games trained: {gamesPlayed}
          {!modelReady && " · Loading model…"}
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
          disabled={aiThinking || isTraining}
          className="min-h-11 w-full max-w-xs rounded-lg bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white active:bg-neutral-600 disabled:opacity-50 sm:w-auto sm:hover:bg-neutral-700"
        >
          New game
        </button>
        {model && (
          <span className="text-center text-xs text-neutral-500">
            Exploration: {(explorationRate(gamesPlayed) * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
