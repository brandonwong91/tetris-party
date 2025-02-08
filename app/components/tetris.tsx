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
      if (data.players) {
        setPlayers(data.players);
        if (data.isMultiplayerMode !== undefined) {
          setIsMultiplayerMode(data.isMultiplayerMode);
        }
        if (data.gameStarted !== undefined) {
          setGameStarted(data.gameStarted);
        }
        if (data.type === "START_GAME") {
          dispatch({ type: "START_GAME" });
        }
      }
    },
  });
  const [showControls, setShowControls] = useState(false);
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (state.isGameOver || !e.changedTouches[0]) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

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
        if (Math.abs(deltaY) > minSwipeDistance) {
          if (deltaY > 0) {
            dispatch({ type: "MOVE_DOWN" });
          } else {
            dispatch({ type: "ROTATE" });
          }
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

  const renderCell = (cell: TetrominoType | null, ghost = false) => {
    if (!cell) return null;

    const style = {
      backgroundColor: ghost ? "#ffffff1a" : TETROMINOS[cell].color,
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
            className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 border-dotted border-gray-900 border-y-2 border-x-2"
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white relative p-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 w-full max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 w-full lg:w-auto order-2 lg:order-1">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded">
            <h2 className="text-xl mb-4">Online Players</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span
                    className={
                      socket.id === player.id ? "font-bold text-blue-400" : ""
                    }
                  >
                    {player.username}
                    {player.status === "join" && (
                      <span className="text-yellow-500 ml-1">(J)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
            {players
              .filter((player) => player.id !== socket.id)
              .map((player) => (
                <div
                  key={player.id}
                  className="border border-gray-700 p-2 bg-gray-800"
                >
                  <div className="text-sm mb-2 flex items-center gap-2">
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
                      <span className="ml-2 text-red-500">(Game Over)</span>
                    )}
                  </div>
                  <div className="grid grid-flow-row">
                    {player.board.map((row, y) => (
                      <div key={y} className="flex">
                        {row.map((cell, x) => (
                          <div
                            key={`${y}-${x}`}
                            className="w-3 h-3 sm:w-4 sm:h-4 border-dotted border-gray-900 border-y-2 border-x-2"
                          >
                            {cell && (
                              <div
                                className="w-full h-full"
                                style={{
                                  backgroundColor:
                                    TETROMINOS[cell as TetrominoType].color,
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm mt-2">Score: {player.score}</div>
                </div>
              ))}
          </div>
        </div>
        <div className="border border-gray-700 p-2 bg-gray-800 mx-auto order-1 lg:order-2">
          <div className="grid grid-flow-row game-board">{renderBoard()}</div>
        </div>
        <div className="flex flex-row lg:flex-col gap-4 order-3 overflow-x-auto lg:overflow-x-visible">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded min-w-[160px]">
            <h2 className="text-xl mb-2">Next Piece</h2>
            {state.nextPiece && renderPiece(state.nextPiece.type)}
          </div>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded min-w-[160px]">
            <h2 className="text-xl mb-2">Held Piece</h2>
            {renderPiece(state.heldPiece?.type || null)}
          </div>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded min-w-[160px]">
            <div className="mb-2">
              <h2 className="text-xl">Score</h2>
              <p className="text-2xl font-bold">{state.score}</p>
            </div>
            <div className="mb-2">
              <h2 className="text-xl">Level</h2>
              <p className="text-2xl font-bold">{state.level}</p>
            </div>
            <div className="mb-4">
              <h2 className="text-xl">Lines</h2>
              <p className="text-2xl font-bold">{state.lines}</p>
            </div>
          </div>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded min-w-[160px]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl">Controls</h2>
              <button
                onClick={() => setShowControls(!showControls)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {showControls ? "▼" : "▶"}
              </button>
            </div>
            {showControls && (
              <div className="space-y-2 text-sm">
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
        <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded w-full sm:w-auto"
            onClick={() => dispatch({ type: "START_GAME" })}
          >
            {state.isGameOver ? "Play Again" : "Start Single Player"}
          </button>
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded w-full sm:w-auto"
            onClick={() =>
              socket.send(JSON.stringify({ type: "JOIN_MULTIPLAYER" }))
            }
          >
            Join Multiplayer
          </button>
        </div>
      )}

      {isMultiplayerMode && !gameStarted && (
        <div className="mt-4 text-center">
          <p className="mb-2">
            Waiting for players... ({players.length} connected)
          </p>
          {players.length > 1 && (
            <button
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded w-full sm:w-auto"
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
// Add touch controls
