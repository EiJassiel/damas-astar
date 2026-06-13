export type CheckersColor = 'red' | 'black';
export type CheckersPieceKind = 'man' | 'king';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export type CheckersPiece = {
  id: string;
  color: CheckersColor;
  kind: CheckersPieceKind;
  row: number;
  col: number;
};

export type CheckersMove = {
  from: { row: number; col: number };
  to: { row: number; col: number };
};

export type AiMoveRequest = {
  difficulty: BotDifficulty;
  board: CheckersPiece[];
  currentPlayer: CheckersColor;
  forcedPieceId?: string | null;
};

export type AiMoveResponse = {
  from: { row: number; col: number };
  to: { row: number; col: number };
  evaluationScore: number;
  algorithm: 'astar';
  pathLength: number;
  nodesExplored: number;
  pathsEvaluated: number;
  goalCount: number;
  computeTimeMs: number;
  goal: { row: number; col: number };
};
