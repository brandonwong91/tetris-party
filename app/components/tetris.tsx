"use client";

import { useCallback, useEffect, useReducer } from "react";
import { INITIAL_GRAVITY, TETROMINOS } from "../lib/tetris/constants";
import { gameReducer, createInitialState } from "../lib/tetris/reducer";
import { getGhostPosition, getTetrominoShape } from "../lib/tetris/utils";
import { TetrominoType } from "../lib/tetris/types";

export function Tetris() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

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
        case "KeyP":
          dispatch({ type: "PAUSE_GAME" });
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
    if (!state.currentPiece || state.isGameOver || state.isPaused) return;

    const interval = setInterval(() => {
      dispatch({ type: "MOVE_DOWN" });
    }, INITIAL_GRAVITY / state.level);

    return () => clearInterval(interval);
  }, [state.currentPiece, state.isGameOver, state.isPaused, state.level]);

  const renderCell = (cell: TetrominoType | null, ghost = false) => {
    if (!cell) return null;

    const style = {
      backgroundColor: ghost ? "#ffffff33" : TETROMINOS[cell].color,
      border: "1px solid rgba(255, 255, 255, 0.1)",
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
          <div key={`${y}-${x}`} className="w-6 h-6">
            {renderCell(cell)}
          </div>
        ))}
      </div>
    ));
  };

  const renderPreview = () => {
    if (!state.nextPiece) return null;

    const shape = getTetrominoShape(state.nextPiece);
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
              {cell && state?.nextPiece
                ? renderCell(state.nextPiece.type)
                : null}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="flex gap-8">
        <div className="border border-gray-700 p-2 bg-gray-800">
          {renderBoard()}
        </div>
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded">
            <h2 className="text-xl mb-2">Next Piece</h2>
            {renderPreview()}
          </div>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded">
            <div className="mb-2">
              <h2 className="text-xl">Score</h2>
              <p className="text-2xl font-bold">{state.score}</p>
            </div>
            <div className="mb-2">
              <h2 className="text-xl">Level</h2>
              <p className="text-2xl font-bold">{state.level}</p>
            </div>
            <div>
              <h2 className="text-xl">Lines</h2>
              <p className="text-2xl font-bold">{state.lines}</p>
            </div>
          </div>
        </div>
      </div>
      {(state.isGameOver || !state.currentPiece) && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          {state.isGameOver ? "Game Over - Play Again" : "Start Game"}
        </button>
      )}
      {state.isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-4xl font-bold">PAUSED</div>
        </div>
      )}
    </div>
  );
}
