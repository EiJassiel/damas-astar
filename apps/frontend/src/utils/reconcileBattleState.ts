import type { CheckersGameState, CheckersPiece } from '../types/checkers';

export function reconcileBattleState(
  previous: CheckersGameState | undefined,
  next: CheckersGameState
) {
  if (!previous) return next;

  const previousPieces = new Map(previous.board.map((piece) => [piece.id, piece]));
  const board = next.board.map((piece) => reusePiece(previousPieces.get(piece.id), piece));

  if (sameBoard(previous.board, board) && shallowEqualGame(previous, next)) {
    return previous;
  }

  return {
    ...next,
    board
  } satisfies CheckersGameState;
}

function reusePiece(previous: CheckersPiece | undefined, next: CheckersPiece) {
  if (
    previous
    && previous.color === next.color
    && previous.kind === next.kind
    && previous.row === next.row
    && previous.col === next.col
  ) {
    return previous;
  }
  return next;
}

function sameBoard(previous: CheckersPiece[], next: CheckersPiece[]) {
  return previous.length === next.length && previous.every((piece, index) => piece === next[index]);
}

function shallowEqualGame(previous: CheckersGameState, next: CheckersGameState) {
  return previous.roomCode === next.roomCode
    && previous.status === next.status
    && previous.turn === next.turn
    && previous.turnNumber === next.turnNumber
    && previous.moveCount === next.moveCount
    && previous.winnerColor === next.winnerColor
    && previous.winnerPlayerId === next.winnerPlayerId
    && previous.result === next.result
    && previous.drawReason === next.drawReason
    && previous.forcedPieceId === next.forcedPieceId
    && previous.lastMove?.from.row === next.lastMove?.from.row
    && previous.lastMove?.from.col === next.lastMove?.from.col
    && previous.lastMove?.to.row === next.lastMove?.to.row
    && previous.lastMove?.to.col === next.lastMove?.to.col
    && previous.lastMove?.capturedPieceId === next.lastMove?.capturedPieceId
    && previous.lastMove?.playerId === next.lastMove?.playerId
    && previous.log.length === next.log.length
    && previous.lastAiMeta?.computeTimeMs === next.lastAiMeta?.computeTimeMs
    && previous.lastAiMeta?.nodesExplored === next.lastAiMeta?.nodesExplored
    && previous.lastAiMeta?.pathsEvaluated === next.lastAiMeta?.pathsEvaluated
    && previous.lastAiMeta?.goalCount === next.lastAiMeta?.goalCount;
}
