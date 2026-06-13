export type CheckersColor = 'red' | 'black';
export type CheckersRoomStatus = 'waiting' | 'ready' | 'in_game' | 'finished';
export type CheckersGameStatus = 'active' | 'finished';
export type CheckersPieceKind = 'man' | 'king';
export type CheckersBotDifficulty = 'easy' | 'medium' | 'hard';
export type AiAlgorithm = 'astar';
export type CheckersResult = 'red_win' | 'black_win' | 'draw' | 'resign' | null;

export type CheckersPlayer = {
  playerId: string;
  userId?: string;
  name: string;
  color: CheckersColor;
  joinedAt: Date;
  isBot?: boolean;
  botDifficulty?: CheckersBotDifficulty;
};

export type CheckersRoomDocument = {
  code: string;
  status: CheckersRoomStatus;
  players: CheckersPlayer[];
  ownerPlayerId: string;
  ownerUserId?: string;
  botDifficulty?: CheckersBotDifficulty;
  aiAlgorithm?: AiAlgorithm;
  gameId?: string;
  createdAt: Date;
  updatedAt: Date;
};

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

export type CheckersLogEntry = {
  turn: number;
  message: string;
  createdAt: Date;
};

export type CheckersGameDocument = {
  roomCode: string;
  userId?: string;
  status: CheckersGameStatus;
  players: CheckersPlayer[];
  botDifficulty?: CheckersBotDifficulty;
  aiAlgorithm?: AiAlgorithm;
  lastAiMeta?: {
    algorithm: AiAlgorithm;
    evaluationScore: number;
    pathLength?: number;
    nodesExplored?: number;
    pathsEvaluated?: number;
    goalCount?: number;
    computeTimeMs?: number;
    goal?: { row: number; col: number };
    championPieceId?: string | null;
  } | null;
  lastAiComparison?: {
    activeAlgorithm: AiAlgorithm;
    sameMove: boolean;
    astar: {
      from: { row: number; col: number };
      to: { row: number; col: number };
      evaluationScore: number;
      pathLength?: number;
      nodesExplored?: number;
      goal?: { row: number; col: number };
    } | null;
  } | null;
  board: CheckersPiece[];
  turn: CheckersColor;
  turnNumber: number;
  moveCount: number;
  movesWithoutCapture: number;
  positionHashes: string[];
  winnerColor?: CheckersColor | null;
  winnerPlayerId?: string | null;
  result?: CheckersResult;
  drawReason?: string | null;
  forcedPieceId?: string | null;
  lastMove?: (CheckersMove & { capturedPieceId?: string | null; playerId: string }) | null;
  log: CheckersLogEntry[];
  createdAt: Date;
  updatedAt: Date;
};

export type CheckersScoreDocument = {
  userId: string;
  playerKey: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winStreak: number;
  bestWinStreak: number;
  totalMovesInWins: number;
  winsForMoveAverage: number;
  updatedAt: Date;
};
