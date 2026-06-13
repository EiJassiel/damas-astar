import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BoardTheme, CheckersColor, CheckersGameState, CheckersPiece, PieceStyle } from '../types/checkers';

type Square = { row: number; col: number };

export function CheckersBoard({
  game,
  playerId,
  boardTheme = 'classic',
  pieceStyle = 'sphere',
  movePending,
  cpuMoveTrace,
  onMove
}: {
  game: CheckersGameState;
  playerId: string;
  boardTheme?: BoardTheme;
  pieceStyle?: PieceStyle;
  movePending: boolean;
  cpuMoveTrace?: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square) => void;
}) {
  const me = game.players.find((player) => player.playerId === playerId);
  const myColor = me?.color;
  const [selected, setSelected] = useState<Square | null>(null);
  const piecesBySquare = useMemo(() => new Map(game.board.map((piece) => [`${piece.row}:${piece.col}`, piece])), [game.board]);
  const highlightedMoves = useMemo(() => {
    if (!selected || !myColor) return new Set<string>();
    const piece = piecesBySquare.get(`${selected.row}:${selected.col}`);
    if (!piece || piece.color !== myColor) return new Set<string>();
    return new Set(legalDestinations(game.board, piece).map((square) => `${square.row}:${square.col}`));
  }, [game.board, myColor, piecesBySquare, selected]);
  const boardRows = myColor === 'black' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const boardCols = myColor === 'black' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const traceLine = useMemo(() => {
    if (!cpuMoveTrace) return null;
    return {
      x1: boardCols.indexOf(cpuMoveTrace.from.col) + 0.5,
      y1: boardRows.indexOf(cpuMoveTrace.from.row) + 0.5,
      x2: boardCols.indexOf(cpuMoveTrace.to.col) + 0.5,
      y2: boardRows.indexOf(cpuMoveTrace.to.row) + 0.5
    };
  }, [boardCols, boardRows, cpuMoveTrace]);
  const displayPieces = useMemo(
    () =>
      game.board.map((piece) => ({
        piece,
        boardRow: boardRows.indexOf(piece.row) + 1,
        boardCol: boardCols.indexOf(piece.col) + 1
      })),
    [boardCols, boardRows, game.board]
  );

  function handleSquare(square: Square) {
    if (movePending || game.status !== 'active' || !myColor || game.turn !== myColor) return;
    const piece = piecesBySquare.get(`${square.row}:${square.col}`);
    if (!selected) {
      if (piece?.color === myColor && (!game.forcedPieceId || piece.id === game.forcedPieceId)) setSelected(square);
      return;
    }
    if (piece?.color === myColor && (!game.forcedPieceId || piece.id === game.forcedPieceId)) {
      setSelected(square);
      return;
    }
    onMove(selected, square);
    setSelected(null);
  }

  return (
    <div className={`checkers-board theme-${boardTheme}`} aria-label="Tablero de damas">
      {traceLine && (
        <svg className="checkers-move-trace" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true">
          <line
            className="checkers-move-trace-line"
            x1={traceLine.x1}
            y1={traceLine.y1}
            x2={traceLine.x2}
            y2={traceLine.y2}
          />
          <circle className="checkers-move-trace-dot from" cx={traceLine.x1} cy={traceLine.y1} r="0.18" />
          <circle className="checkers-move-trace-dot to" cx={traceLine.x2} cy={traceLine.y2} r="0.22" />
        </svg>
      )}
      {boardRows.flatMap((row) =>
        boardCols.map((col) => {
          const key = `${row}:${col}`;
          const playable = (row + col) % 2 === 1;
          const isSelected = selected?.row === row && selected.col === col;
          const isLastFrom = Boolean(game.lastMove && game.lastMove.from.row === row && game.lastMove.from.col === col);
          const isLastTo = Boolean(game.lastMove && game.lastMove.to.row === row && game.lastMove.to.col === col);
          const isHint = highlightedMoves.has(key);
          return (
            <button
              key={key}
              className={['checkers-square', playable ? 'dark' : 'light', isSelected ? 'selected' : '', isHint ? 'move-hint' : '', isLastFrom ? 'last-move-from' : '', isLastTo ? 'last-move-to' : ''].filter(Boolean).join(' ')}
              onClick={() => handleSquare({ row, col })}
              type="button"
              aria-label={squareName({ row, col })}
            />
          );
        })
      )}
      <div className="checkers-piece-layer" aria-hidden="true">
        {displayPieces.map(({ piece, boardRow, boardCol }) => (
          <div
            key={piece.id}
            className="checkers-piece-slot"
            style={{ gridRow: boardRow, gridColumn: boardCol }}
          >
            <Piece piece={piece} pieceStyle={pieceStyle} />
          </div>
        ))}
      </div>
    </div>
  );
}

function legalDestinations(board: CheckersPiece[], piece: CheckersPiece) {
  const moves: Square[] = [];
  const captures: Square[] = [];
  for (const [dr, dc] of directions(piece)) {
    const step = { row: piece.row + dr, col: piece.col + dc };
    const jump = { row: piece.row + dr * 2, col: piece.col + dc * 2 };
    if (inBounds(step) && !pieceAt(board, step)) moves.push(step);
    const middle = pieceAt(board, step);
    if (middle && middle.color !== piece.color && inBounds(jump) && !pieceAt(board, jump)) captures.push(jump);
  }
  const anyCapture = board.some((candidate) => candidate.color === piece.color && legalCaptures(board, candidate).length > 0);
  if (captures.length > 0) return captures;
  return anyCapture ? [] : moves;
}

function legalCaptures(board: CheckersPiece[], piece: CheckersPiece) {
  return directions(piece)
    .map(([dr, dc]) => ({ middle: { row: piece.row + dr, col: piece.col + dc }, jump: { row: piece.row + dr * 2, col: piece.col + dc * 2 } }))
    .filter(({ middle, jump }) => {
      const target = pieceAt(board, middle);
      return target && target.color !== piece.color && inBounds(jump) && !pieceAt(board, jump);
    });
}

function directions(piece: CheckersPiece) {
  if (piece.kind === 'king') return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return piece.color === 'red' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
}

function inBounds(square: Square) {
  return square.row >= 0 && square.row < 8 && square.col >= 0 && square.col < 8;
}

function pieceAt(board: CheckersPiece[], square: Square) {
  return board.find((piece) => piece.row === square.row && piece.col === square.col);
}

const Piece = memo(function Piece({ piece, pieceStyle }: { piece: CheckersPiece; pieceStyle: PieceStyle }) {
  return (
    <motion.span
      layout
      className={`checkers-piece ${piece.color} piece-${pieceStyle}`}
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 620, damping: 36, mass: 0.7 }}
    >
      {piece.kind === 'king' && <Crown size={22} />}
    </motion.span>
  );
});

function squareName(square: Square) {
  return `${String.fromCharCode(65 + square.col)}${8 - square.row}`;
}
