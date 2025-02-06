export type Position = {
  x: number;
  y: number;
};

export type Rotation = 0 | 90 | 180 | 270;

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type Tetromino = {
  type: TetrominoType;
  position: Position;
  rotation: Rotation;
};

export type GameState = {
  board: (TetrominoType | null)[][];
  currentPiece: Tetromino | null;
  nextPiece: Tetromino | null;
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
};

export type GameAction =
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "MOVE_DOWN" }
  | { type: "ROTATE" }
  | { type: "HARD_DROP" }
  | { type: "START_GAME" }
  | { type: "PAUSE_GAME" }
  | { type: "GAME_OVER" };
