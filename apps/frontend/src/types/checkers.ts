export type BoardTheme = 'classic' | 'neon' | 'wood';
export type PieceStyle = 'sphere' | 'flat' | 'marble';
export type CheckersColor = 'red' | 'black';
export type AiAlgorithm = 'astar';

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  boardTheme: BoardTheme;
  pieceStyle: PieceStyle;
  unlockedThemes: BoardTheme[];
  unlockedPieceStyles: PieceStyle[];
  premium?: boolean;
  premiumSince?: string | null;
  purchasedCosmetics?: string[];
};

export type UserStats = {
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
  updatedAt: string;
};

export type CheckersPlayer = {
  playerId: string;
  userId?: string;
  name: string;
  color: CheckersColor;
  joinedAt: string;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
};

export type CheckersRoomState = {
  code: string;
  status: 'waiting' | 'ready' | 'in_game' | 'finished';
  players: CheckersPlayer[];
  botDifficulty?: 'easy' | 'medium' | 'hard';
  aiAlgorithm?: AiAlgorithm;
  gameId?: string;
};

export type CheckersPiece = {
  id: string;
  color: CheckersColor;
  kind: 'man' | 'king';
  row: number;
  col: number;
};

export type AiMoveMeta = {
  algorithm: AiAlgorithm;
  evaluationScore: number;
  pathLength?: number;
  nodesExplored?: number;
  pathsEvaluated?: number;
  goalCount?: number;
  computeTimeMs?: number;
  goal?: { row: number; col: number };
  championPieceId?: string | null;
};

export type AiComparisonSnapshot = {
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
};

export type CheckersGameState = {
  roomCode: string;
  userId: string;
  status: 'active' | 'finished';
  players: CheckersPlayer[];
  botDifficulty?: 'easy' | 'medium' | 'hard';
  aiAlgorithm?: AiAlgorithm;
  lastAiMeta?: AiMoveMeta | null;
  lastAiComparison?: AiComparisonSnapshot | null;
  board: CheckersPiece[];
  turn: CheckersColor;
  turnNumber: number;
  moveCount: number;
  winnerColor?: CheckersColor | null;
  winnerPlayerId?: string | null;
  result?: 'red_win' | 'black_win' | 'draw' | 'resign' | null;
  drawReason?: string | null;
  forcedPieceId?: string | null;
  lastMove?: {
    from: { row: number; col: number };
    to: { row: number; col: number };
    capturedPieceId?: string | null;
    playerId: string;
  } | null;
  log: Array<{ turn: number; message: string; createdAt: string }>;
};

export type SavedGameSummary = {
  roomCode: string;
  status: 'active' | 'finished';
  turn: CheckersColor;
  turnNumber: number;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  winnerColor?: CheckersColor | null;
  result?: 'red_win' | 'black_win' | 'draw' | 'resign' | null;
  updatedAt: string;
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  playerKey: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: number;
  avgMovesInWins: number;
  bestWinStreak: number;
  updatedAt: string;
};
