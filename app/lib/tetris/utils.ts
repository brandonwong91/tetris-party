import { Position, Rotation, Tetromino, TetrominoType } from "./types";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  I_WALL_KICK_TESTS,
  TETROMINOS,
  WALL_KICK_TESTS,
} from "./constants";

export const createEmptyBoard = () =>
  Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(null));

export const getRandomTetrominoType = (): TetrominoType => {
  const types = Object.keys(TETROMINOS) as TetrominoType[];
  return types[Math.floor(Math.random() * types.length)];
};

export const createTetromino = (type: TetrominoType): Tetromino => ({
  type,
  position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
  rotation: 0,
});

export const rotateMatrix = <T>(matrix: readonly (readonly T[])[]) => {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  ) as T[][];

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      rotated[j][size - 1 - i] = matrix[i][j];
    }
  }

  return rotated as typeof matrix;
};

export const getTetrominoShape = (tetromino: Tetromino) => {
  let shape = TETROMINOS[tetromino.type].shape;
  const rotations = tetromino.rotation / 90;

  for (let i = 0; i < rotations; i++) {
    shape = rotateMatrix(shape);
  }

  return shape;
};

export const isValidPosition = (
  board: (TetrominoType | null)[][],
  tetromino: Tetromino
): boolean => {
  const shape = getTetrominoShape(tetromino);

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardX = tetromino.position.x + x;
        const boardY = tetromino.position.y + y;

        // Check board boundaries first
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return false;
        }

        // Then check collision with existing pieces, but only if we're within the board
        if (boardY >= 0 && board[boardY][boardX] !== null) {
          return false;
        }
      }
    }
  }

  return true;
};

export const getWallKickTests = (
  tetromino: Tetromino,
  prevRotation: Rotation
) => {
  const tests = tetromino.type === "I" ? I_WALL_KICK_TESTS : WALL_KICK_TESTS;
  const rotationDiff = ((tetromino.rotation - prevRotation + 360) %
    360) as Rotation;
  const key = `${prevRotation}>${rotationDiff}` as keyof typeof tests;
  return tests[key] || [];
};

export const tryRotate = (
  board: (TetrominoType | null)[][],
  tetromino: Tetromino
): Tetromino | null => {
  const prevRotation = tetromino.rotation;
  const newRotation = ((prevRotation + 90) % 360) as Rotation;

  const rotatedTetromino = {
    ...tetromino,
    rotation: newRotation,
  };

  if (isValidPosition(board, rotatedTetromino)) {
    return rotatedTetromino;
  }

  const tests = getWallKickTests(rotatedTetromino, prevRotation);

  for (const [offsetX, offsetY] of tests) {
    const kickedTetromino = {
      ...rotatedTetromino,
      position: {
        x: rotatedTetromino.position.x + offsetX,
        y: rotatedTetromino.position.y + offsetY,
      },
    };

    if (isValidPosition(board, kickedTetromino)) {
      return kickedTetromino;
    }
  }

  return null;
};

export const lockTetromino = (
  board: (TetrominoType | null)[][],
  tetromino: Tetromino
): (TetrominoType | null)[][] => {
  const newBoard = board.map((row) => [...row]);
  const shape = getTetrominoShape(tetromino);

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardY = tetromino.position.y + y;
        if (boardY >= 0) {
          newBoard[boardY][tetromino.position.x + x] = tetromino.type;
        }
      }
    }
  }

  return newBoard;
};

export const clearLines = (board: (TetrominoType | null)[][]) => {
  let linesCleared = 0;
  const newBoard = board.filter((row) => {
    const isLineFull = row.every((cell) => cell !== null);
    if (isLineFull) linesCleared++;
    return !isLineFull;
  });

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null));
  }

  return { newBoard, linesCleared };
};

export const getGhostPosition = (
  board: (TetrominoType | null)[][],
  tetromino: Tetromino
): Position => {
  let ghostY = tetromino.position.y;

  while (
    isValidPosition(board, {
      ...tetromino,
      position: { ...tetromino.position, y: ghostY + 1 },
    })
  ) {
    ghostY++;
  }

  return { x: tetromino.position.x, y: ghostY };
};
