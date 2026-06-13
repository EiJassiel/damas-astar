import { astarPath, heuristic, isPlayable } from './pathfinding';
import type {
  AiMoveRequest,
  AiMoveResponse,
  CheckersColor,
  CheckersMove,
  CheckersPiece,
  CheckersPieceKind
} from './types';

const BOARD_SIZE = 8;
const UNREACHABLE = 999;

type MoveOption = CheckersMove & { capture: boolean };

type GameState = {
  board: CheckersPiece[];
  turn: CheckersColor;
  forcedPieceId: string | null;
};

type MoveEvaluation = {
  move: MoveOption;
  totalCost: number;
  pathLength: number;
  nodesExplored: number;
  goal: { row: number; col: number };
  pathsEvaluated: number;
};

let totalNodesExplored = 0;
let totalPathsEvaluated = 0;

export function chooseAiMove(request: AiMoveRequest): AiMoveResponse | null {
  const started = performance.now();
  totalNodesExplored = 0;
  totalPathsEvaluated = 0;

  const state: GameState = {
    board: structuredClone(request.board),
    turn: request.currentPlayer,
    forcedPieceId: request.forcedPieceId ?? null
  };

  const moves = collectLegalMoves(state);
  if (moves.length === 0) return null;

  const evaluated = moves.map((move) => evaluateMoveWithAstar(state.board, move, request.difficulty));
  const ranked = [...evaluated].sort((a, b) => a.totalCost - b.totalCost);
  const pick = ranked[0];
  if (!pick) return null;

  return {
    from: pick.move.from,
    to: pick.move.to,
    evaluationScore: Math.round((UNREACHABLE - pick.totalCost) * 10) / 10,
    algorithm: 'astar',
    pathLength: pick.pathLength,
    nodesExplored: totalNodesExplored,
    pathsEvaluated: totalPathsEvaluated,
    goalCount: pick.pathsEvaluated,
    computeTimeMs: Math.round(performance.now() - started),
    goal: pick.goal
  };
}

function evaluateMoveWithAstar(
  board: CheckersPiece[],
  move: MoveOption,
  difficulty: AiMoveRequest['difficulty']
): MoveEvaluation {
  const piece = board.find((candidate) => candidate.row === move.from.row && candidate.col === move.from.col);
  if (!piece) {
    return {
      move,
      totalCost: UNREACHABLE,
      pathLength: UNREACHABLE,
      nodesExplored: 0,
      goal: move.to,
      pathsEvaluated: 0
    };
  }

  const nextBoard = applyMoveToBoard(board, piece, move);
  const movedPiece = nextBoard.find((candidate) => candidate.id === piece.id);
  if (!movedPiece) {
    return {
      move,
      totalCost: UNREACHABLE,
      pathLength: UNREACHABLE,
      nodesExplored: 0,
      goal: move.to,
      pathsEvaluated: 0
    };
  }

  const stepCost = move.capture ? 1 : 1;
  const goals = pickGoals(movedPiece, nextBoard, difficulty);
  let bestRemaining = UNREACHABLE;
  let bestGoal = goals[0] ?? move.to;
  let moveNodes = 0;
  let pathsForMove = 0;

  const blocked = buildBlockedSet(nextBoard, movedPiece.id);
  const neighbors = buildNeighborFn(movedPiece);

  for (const goal of goals) {
    pathsForMove += 1;
    totalPathsEvaluated += 1;
    const path = astarPath({ row: movedPiece.row, col: movedPiece.col }, goal, (pos) => blocked.has(keyOf(pos)), neighbors);
    const explored = path?.nodesExplored ?? 0;
    moveNodes += explored;
    totalNodesExplored += explored;
    const remaining = path?.pathLength ?? UNREACHABLE;
    if (remaining < bestRemaining) {
      bestRemaining = remaining;
      bestGoal = goal;
    }
  }

  const totalCost = stepCost + bestRemaining;
  return {
    move,
    totalCost,
    pathLength: totalCost,
    nodesExplored: moveNodes,
    goal: bestGoal,
    pathsEvaluated: pathsForMove
  };
}

function applyMoveToBoard(board: CheckersPiece[], piece: CheckersPiece, move: MoveOption) {
  const selected = legalMovesForPiece(board, piece).find((candidate) => sameSquare(candidate.to, move.to));
  if (!selected) return board;
  const next = board.filter((candidate) => candidate.id !== selected.capture?.id);
  return next.map((candidate) => {
    if (candidate.id !== piece.id) return candidate;
    const row = move.to.row;
    const col = move.to.col;
    const kind: CheckersPieceKind =
      candidate.kind === 'king' ||
      (candidate.color === 'red' && row === 0) ||
      (candidate.color === 'black' && row === BOARD_SIZE - 1)
        ? 'king'
        : candidate.kind;
    return { ...candidate, row, col, kind } satisfies CheckersPiece;
  });
}

function pickGoals(piece: CheckersPiece, board: CheckersPiece[], difficulty: AiMoveRequest['difficulty']) {
  const goals: Array<{ row: number; col: number }> = [];

  if (piece.kind === 'king') {
    goals.push(nearestPlayableSquare({ row: 3, col: 3 }, board));
  } else {
    const promotionRow = piece.color === 'black' ? BOARD_SIZE - 1 : 0;
    goals.push(...promotionGoals(promotionRow, board));
  }

  for (const jump of capturableJumpTargets(board, piece)) goals.push(jump);
  return dedupeSquares(goals);
}

function promotionGoals(promotionRow: number, board: CheckersPiece[]) {
  const goals: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = { row, col };
      if (isPlayable(row, col) && !pieceAt(board, square)) goals.push(square);
    }
  }
  return goals.sort((a, b) => Math.abs(a.row - promotionRow) - Math.abs(b.row - promotionRow));
}

function capturableJumpTargets(board: CheckersPiece[], piece: CheckersPiece) {
  const targets: Array<{ row: number; col: number }> = [];
  for (const enemy of board) {
    if (enemy.color === piece.color) continue;
    for (const [dr, dc] of directions(piece)) {
      const step = { row: enemy.row - dr, col: enemy.col - dc };
      const jump = { row: enemy.row + dr, col: enemy.col + dc };
      if (
        piece.row === step.row &&
        piece.col === step.col &&
        inBounds(jump) &&
        isPlayable(jump.row, jump.col) &&
        !pieceAt(board, jump)
      ) {
        targets.push(jump);
      }
    }
  }
  return targets;
}

function dedupeSquares(squares: Array<{ row: number; col: number }>) {
  const seen = new Set<string>();
  return squares.filter((square) => {
    const key = keyOf(square);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nearestPlayableSquare(target: { row: number; col: number }, board: CheckersPiece[]) {
  let best: { row: number; col: number } | null = null;
  let bestDistance = Infinity;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isPlayable(row, col) || pieceAt(board, { row, col })) continue;
      const distance = heuristic({ row, col }, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { row, col };
      }
    }
  }
  return best ?? target;
}

function buildBlockedSet(board: CheckersPiece[], movingPieceId: string) {
  const blocked = new Set<string>();
  for (const piece of board) {
    if (piece.id === movingPieceId) continue;
    blocked.add(keyOf({ row: piece.row, col: piece.col }));
  }
  return blocked;
}

function buildNeighborFn(piece: CheckersPiece) {
  const dirs = directions(piece);
  return (pos: { row: number; col: number }) => {
    const next: Array<{ row: number; col: number }> = [];
    for (const [dr, dc] of dirs) {
      const step = { row: pos.row + dr, col: pos.col + dc };
      if (inBounds(step) && isPlayable(step.row, step.col)) next.push(step);
    }
    return next;
  };
}

function collectLegalMoves(state: GameState): MoveOption[] {
  const pieces = state.board.filter(
    (piece) => piece.color === state.turn && (!state.forcedPieceId || piece.id === state.forcedPieceId)
  );

  const allMoves = pieces.flatMap((piece) =>
    legalMovesForPiece(state.board, piece).map((move) => ({
      from: { row: piece.row, col: piece.col },
      to: move.to,
      capture: Boolean(move.capture)
    }))
  );

  if (allMoves.length === 0) return [];
  if (state.forcedPieceId) return allMoves.filter((move) => move.capture);

  const captures = allMoves.filter((move) => move.capture);
  return captures.length > 0 ? captures : allMoves;
}

function legalMovesForPiece(board: CheckersPiece[], piece: CheckersPiece) {
  const moves: Array<{ to: { row: number; col: number }; capture?: CheckersPiece }> = [];
  for (const [dr, dc] of directions(piece)) {
    const step = { row: piece.row + dr, col: piece.col + dc };
    const jump = { row: piece.row + dr * 2, col: piece.col + dc * 2 };
    if (inBounds(step) && isPlayable(step.row, step.col) && !pieceAt(board, step)) {
      moves.push({ to: step });
    }
    const middle = pieceAt(board, step);
    if (
      middle &&
      middle.color !== piece.color &&
      inBounds(jump) &&
      isPlayable(jump.row, jump.col) &&
      !pieceAt(board, jump)
    ) {
      moves.push({ to: jump, capture: middle });
    }
  }
  return moves;
}

function directions(piece: CheckersPiece) {
  if (piece.kind === 'king') return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return piece.color === 'red' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
}

function pieceAt(board: CheckersPiece[], square: { row: number; col: number }) {
  return board.find((piece) => piece.row === square.row && piece.col === square.col);
}

function sameSquare(a: { row: number; col: number }, b: { row: number; col: number }) {
  return a.row === b.row && a.col === b.col;
}

function inBounds(square: { row: number; col: number }) {
  return square.row >= 0 && square.row < BOARD_SIZE && square.col >= 0 && square.col < BOARD_SIZE;
}

function keyOf(pos: { row: number; col: number }) {
  return `${pos.row}:${pos.col}`;
}
