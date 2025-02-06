import { GameAction, GameState } from "./types";
import {
  POINTS_SINGLE,
  POINTS_DOUBLE,
  POINTS_TRIPLE,
  POINTS_TETRIS,
  LEVEL_LINES,
} from "./constants";
import {
  createEmptyBoard,
  createTetromino,
  getRandomTetrominoType,
  isValidPosition,
  lockTetromino,
  clearLines,
  tryRotate,
} from "./utils";

export const createInitialState = (): GameState => ({
  board: createEmptyBoard(),
  currentPiece: null,
  nextPiece: null,
  score: 0,
  level: 1,
  lines: 0,
  isGameOver: false,
  isPaused: false,
});

const getPoints = (lines: number): number => {
  switch (lines) {
    case 1:
      return POINTS_SINGLE;
    case 2:
      return POINTS_DOUBLE;
    case 3:
      return POINTS_TRIPLE;
    case 4:
      return POINTS_TETRIS;
    default:
      return 0;
  }
};

const movePiece = (state: GameState, dx: number, dy: number): GameState => {
  if (!state.currentPiece || state.isGameOver || state.isPaused) {
    return state;
  }

  const newPiece = {
    ...state.currentPiece,
    position: {
      x: state.currentPiece.position.x + dx,
      y: state.currentPiece.position.y + dy,
    },
  };

  if (isValidPosition(state.board, newPiece)) {
    return { ...state, currentPiece: newPiece };
  }

  if (dy > 0) {
    const newBoard = lockTetromino(state.board, state.currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    const points = getPoints(linesCleared);
    const newLines = state.lines + linesCleared;
    const newLevel = Math.floor(newLines / LEVEL_LINES) + 1;
    const nextPiece = createTetromino(getRandomTetrominoType());

    // Check if the next piece can be placed
    if (!isValidPosition(clearedBoard, nextPiece)) {
      return { ...state, isGameOver: true };
    }

    return {
      ...state,
      board: clearedBoard,
      currentPiece: state.nextPiece,
      nextPiece: createTetromino(getRandomTetrominoType()),
      score: state.score + points,
      level: newLevel,
      lines: newLines,
    };
  }

  return state;
};

const hardDrop = (state: GameState): GameState => {
  if (!state.currentPiece || state.isGameOver || state.isPaused) {
    return state;
  }

  let newPiece = state.currentPiece;
  while (
    isValidPosition(state.board, {
      ...newPiece,
      position: { ...newPiece.position, y: newPiece.position.y + 1 },
    })
  ) {
    newPiece = {
      ...newPiece,
      position: { ...newPiece.position, y: newPiece.position.y + 1 },
    };
  }

  return movePiece(
    {
      ...state,
      currentPiece: newPiece,
    },
    0,
    1
  );
};

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  if (state.isGameOver && action.type !== "START_GAME") {
    return state;
  }

  switch (action.type) {
    case "START_GAME":
      return {
        ...createInitialState(),
        currentPiece: createTetromino(getRandomTetrominoType()),
        nextPiece: createTetromino(getRandomTetrominoType()),
      };

    case "PAUSE_GAME":
      return { ...state, isPaused: !state.isPaused };

    case "MOVE_LEFT":
      return movePiece(state, -1, 0);

    case "MOVE_RIGHT":
      return movePiece(state, 1, 0);

    case "MOVE_DOWN":
      return movePiece(state, 0, 1);

    case "ROTATE":
      if (!state.currentPiece || state.isGameOver || state.isPaused) {
        return state;
      }
      const rotatedPiece = tryRotate(state.board, state.currentPiece);
      return rotatedPiece ? { ...state, currentPiece: rotatedPiece } : state;

    case "HARD_DROP":
      return hardDrop(state);

    case "GAME_OVER":
      return { ...state, isGameOver: true };

    default:
      return state;
  }
};
