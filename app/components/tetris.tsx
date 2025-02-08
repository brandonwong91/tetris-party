"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { PARTYKIT_HOST } from "../lib/constants";
import { INITIAL_GRAVITY, TETROMINOS } from "../lib/tetris/constants";
import { gameReducer, createInitialState } from "../lib/tetris/reducer";
import { getGhostPosition, getTetrominoShape } from "../lib/tetris/utils";
import { TetrominoType } from "../lib/tetris/types";
import usePartySocket from "partysocket/react";

export function Tetris() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [players, setPlayers] = useState<
    Array<{
      id: string;
      username: string;
      status: string;
      board: (string | null)[][];
      score: number;
      level: number;
      lines: number;
      isGameOver: boolean;
    }>
  >([]);
  const [isMultiplayerMode, setIsMultiplayerMode] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: "tetris",
    onMessage(event) {
      const data = JSON.parse(event.data);
      if (
        data.type === "GARBAGE_LINES" &&
        data.recipients.includes(socket.id)
      ) {
        dispatch({ type: "GARBAGE_LINES", lines: data.lines });
      } else if (data.players) {
        setPlayers(data.players);
        if (data.isMultiplayerMode !== undefined) {
          setIsMultiplayerMode(data.isMultiplayerMode);
        }
        if (data.gameStarted !== undefined) {
          setGameStarted(data.gameStarted);
        }
        if (data.type === "START_GAME" && data.players) {
          if (data.players.includes(socket.id)) {
            dispatch({ type: "START_GAME" });
          }
        }
      }
    },
  });
  const [showControls, setShowControls] = useState(false);
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const minSwipeDistance = 30;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (state.isGameOver || !e.changedTouches[0]) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const touchDuration = Date.now() - touchStartTime;

      // Check if it's a tap (short duration and minimal movement)
      if (
        touchDuration < 200 &&
        Math.abs(deltaX) < 10 &&
        Math.abs(deltaY) < 10
      ) {
        if (e.target instanceof Element && e.target.closest(".game-board")) {
          dispatch({ type: "ROTATE" });
          return;
        }
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            dispatch({ type: "MOVE_RIGHT" });
          } else {
            dispatch({ type: "MOVE_LEFT" });
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance && deltaY > 0) {
          dispatch({ type: "MOVE_DOWN" });
        }
      }
    };

    const handleDoubleTap = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (e.target instanceof Element && e.target.closest(".game-board")) {
        dispatch({ type: "HOLD_PIECE" });
      } else {
        dispatch({ type: "HARD_DROP" });
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("dblclick", handleDoubleTap);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("dblclick", handleDoubleTap);
    };
  }, [state.isGameOver, dispatch]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (state.isGameOver) return;

      switch (event.code) {
        case "ArrowLeft":
          dispatch({ type: "MOVE_LEFT" });
          break;
        case "ArrowRight":
          dispatch({ type: "MOVE_RIGHT" });
          break;
        case "ArrowDown":
          dispatch({ type: "MOVE_DOWN" });
          break;
        case "ArrowUp":
          dispatch({ type: "ROTATE" });
          break;
        case "Space":
          dispatch({ type: "HARD_DROP" });
          break;
        case "KeyQ":
          dispatch({ type: "PAUSE_GAME" });
          break;
        case "KeyS":
          dispatch({ type: "HOLD_PIECE" });
          break;
      }
    },
    [state.isGameOver]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!state.currentPiece || state.isPaused) return;

    const interval = setInterval(() => {
      dispatch({ type: "MOVE_DOWN" });
    }, INITIAL_GRAVITY / state.level);

    // Send game state to server
    socket.send(
      JSON.stringify({
        board: state.board,
        score: state.score,
        level: state.level,
        lines: state.lines,
        isGameOver: state.isGameOver,
      })
    );

    return () => clearInterval(interval);
  }, [
    state.currentPiece,
    state.isGameOver,
    state.isPaused,
    state.level,
    state.board,
    state.score,
    state.lines,
    socket,
  ]);

  const renderCell = (cell: TetrominoType | null | "G", ghost = false) => {
    if (!cell) return null;

    const style = {
      backgroundColor: ghost
        ? "#ffffff1a"
        : cell === "G"
        ? "#4b5563"
        : TETROMINOS[cell as TetrominoType].color,
      border: "1px solid rgba(255, 255, 255, 0.3)",
    };

    return <div className="w-full h-full" style={style} />;
  };

  const renderBoard = () => {
    const board = state.board.map((row) => [...row]);

    if (state.currentPiece) {
      const shape = getTetrominoShape(state.currentPiece);
      const ghost = getGhostPosition(state.board, state.currentPiece);

      // Render ghost piece
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardY = ghost.y + y;
            const boardX = ghost.x + x;
            if (boardY >= 0 && boardY < board.length) {
              board[boardY][boardX] = state.currentPiece.type;
            }
          }
        }
      }

      // Render current piece
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardY = state.currentPiece.position.y + y;
            const boardX = state.currentPiece.position.x + x;
            if (boardY >= 0 && boardY < board.length) {
              board[boardY][boardX] = state.currentPiece.type;
            }
          }
        }
      }
    }

    return board.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={`${y}-${x}`}
            className="w-7 h-7 md:w-6 md:h-6 border-dotted border-gray-900 border-y-2 border-x-2"
          >
            {renderCell(cell)}
          </div>
        ))}
      </div>
    ));
  };

  const renderPiece = (piece: TetrominoType | null) => {
    if (!piece) return null;

    const shape = getTetrominoShape({
      type: piece,
      position: { x: 0, y: 0 },
      rotation: 0,
    });
    const previewGrid = Array(4)
      .fill(null)
      .map(() => Array(4).fill(false));

    // Calculate offset to center the piece
    const offsetY = Math.floor((4 - shape.length) / 2);
    const offsetX = Math.floor((4 - shape[0].length) / 2);

    // Place the shape in the center of the preview grid
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          previewGrid[y + offsetY][x + offsetX] = true;
        }
      }
    }

    return (
      <div className="grid grid-cols-4 gap-1">
        {previewGrid.map((row, y) =>
          row.map((cell, x) => (
            <div key={`${y}-${x}`} className="w-6 h-6">
              {cell ? renderCell(piece) : null}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white relative p-2">
      <div className="flex-col gap-2 lg:flex-row flex">
        <div className="flex xs:grid xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
          {players
            .filter((player) => player.id !== socket.id)
            .map((player) => (
              <div
                key={player.id}
                className="border border-gray-700 p-1 h-fit w-fit bg-gray-800"
              >
                <div className="text-xs mb-1 flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: player.isGameOver
                        ? "#ef4444"
                        : "#22c55e",
                    }}
                  />
                  {player.username}
                  {player.isGameOver && (
                    <span className="ml-1 text-red-500">(Game Over)</span>
                  )}
                </div>
                <div className="grid grid-flow-row">
                  {player.board?.map((row, y) => (
                    <div key={y} className="flex">
                      {row.map((cell, x) => (
                        <div
                          key={`${y}-${x}`}
                          className="w-2 h-2 border-dotted border-gray-900 border"
                        >
                          {cell && (
                            <div
                              className="w-full h-full"
                              style={{
                                backgroundColor:
                                  cell === "G"
                                    ? "#4b5563"
                                    : TETROMINOS[cell as TetrominoType].color,
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-xs mt-1">Score: {player.score}</div>
              </div>
            ))}
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <div className="p-2 bg-gray-800 border border-gray-700 rounded w-fit self-center">
            <h2 className="text-lg mb-2">Online Players</h2>
            <div className="space-y-1">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-1">
                  <div className="flex flex-col items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              player.status === "online"
                                ? "#22c55e"
                                : player.status === "join"
                                ? "#3b82f6"
                                : "#6b7280",
                          }}
                        />
                        <div
                          className={
                            socket.id === player.id
                              ? "font-bold text-blue-400"
                              : ""
                          }
                        >
                          {player.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      Score: {player.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border border-gray-700 p-1 bg-gray-800 mx-auto order-3 lg:order-2 h-fit relative">
          <div className="grid grid-flow-row game-board h-fit">
            {renderBoard()}
          </div>
          <button
            onClick={() => dispatch({ type: "PAUSE_GAME" })}
            className="md:hidden absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
            aria-label="Pause game"
          >
            {state.isPaused ? "▶" : "⏸"}
          </button>
        </div>
        <div className="flex flex-row lg:flex-col gap-2  overflow-x-auto lg:overflow-x-visible order-1 flex-wrap">
          <div className="p-2 bg-gray-800 border border-gray-700 rounded min-w-[120px]">
            <h2 className="text-lg mb-1">Next</h2>
            {state.nextPiece && renderPiece(state.nextPiece.type)}
          </div>
          <div className="p-2 bg-gray-800 border border-gray-700 rounded min-w-[120px]">
            <h2 className="text-lg mb-1">Held</h2>
            {renderPiece(state.heldPiece?.type || null)}
          </div>
          <div className="p-2 bg-gray-800 border border-gray-700 rounded min-w-[120px]">
            <div className="mb-1">
              <h2 className="text-lg">Score</h2>
              <p className="text-xl font-bold">{state.score}</p>
            </div>
            <div className="mb-1">
              <h2 className="text-lg">Level</h2>
              <p className="text-xl font-bold">{state.level}</p>
            </div>
            <div className="mb-2">
              <h2 className="text-lg">Lines</h2>
              <p className="text-xl font-bold">{state.lines}</p>
            </div>
          </div>
          <div className="p-2 bg-gray-800 border border-gray-700 rounded min-w-[120px]">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg">Controls</h2>
              <button
                onClick={() => setShowControls(!showControls)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {showControls ? "▼" : "▶"}
              </button>
            </div>
            {showControls && (
              <div className="space-y-1 text-xs">
                <p>← → : Move left/right</p>
                <p>↓ : Move down</p>
                <p>↑ : Rotate</p>
                <p>Space : Hard drop</p>
                <p>S : Hold piece</p>
                <p>Q : Pause game</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game state overlays and controls */}
      {((!isMultiplayerMode && !state.currentPiece) || state.isGameOver) && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded w-full sm:w-auto"
            onClick={() => dispatch({ type: "START_GAME" })}
          >
            {state.isGameOver ? "Play Again" : "Start Single Player"}
          </button>
          <button
            className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded w-full sm:w-auto"
            onClick={() =>
              socket.send(
                JSON.stringify({
                  type: "JOIN_MULTIPLAYER",
                  id: socket.id,
                })
              )
            }
          >
            Join Multiplayer
          </button>
        </div>
      )}

      {isMultiplayerMode && !gameStarted && (
        <div className="mt-2 text-center">
          <p className="mb-1">
            Waiting for players... ({players.length} connected)
          </p>
          {players.length > 1 && (
            <button
              className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded w-full sm:w-auto"
              onClick={() =>
                socket.send(JSON.stringify({ type: "START_MULTIPLAYER" }))
              }
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {/* Pause overlay */}
      {state.isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-4xl font-bold">PAUSED</div>
        </div>
      )}
    </div>
  );
}
