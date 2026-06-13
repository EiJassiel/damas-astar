import { describe, expect, test } from 'bun:test';
import { chooseAiMove } from './engine';
import { astarPath } from './pathfinding';
import type { CheckersPiece } from './types';

describe('A* pathfinding', () => {
  test('finds a diagonal path around blocked squares', () => {
    const blocked = new Set(['2:3']);
    const result = astarPath(
      { row: 1, col: 2 },
      { row: 4, col: 5 },
      (pos) => blocked.has(`${pos.row}:${pos.col}`),
      (pos) => [
        { row: pos.row + 1, col: pos.col + 1 },
        { row: pos.row + 1, col: pos.col - 1 },
        { row: pos.row - 1, col: pos.col + 1 },
        { row: pos.row - 1, col: pos.col - 1 }
      ].filter((pos) => pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8 && (pos.row + pos.col) % 2 === 1)
    );

    expect(result).not.toBeNull();
    expect(result?.path.at(0)).toEqual({ row: 1, col: 2 });
    expect(result?.goal).toEqual({ row: 4, col: 5 });
  });

  test('returns null when the goal is unreachable', () => {
    const result = astarPath(
      { row: 1, col: 2 },
      { row: 3, col: 4 },
      (pos) => pos.row === 2,
      (pos) => [
        { row: pos.row + 1, col: pos.col + 1 },
        { row: pos.row + 1, col: pos.col - 1 }
      ].filter((pos) => pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8 && (pos.row + pos.col) % 2 === 1)
    );

    expect(result).toBeNull();
  });
});

describe('A* checkers move selection', () => {
  test('chooses the mandatory capture when one is available', () => {
    const board: CheckersPiece[] = [
      { id: 'black-1', color: 'black', kind: 'man', row: 2, col: 1 },
      { id: 'red-1', color: 'red', kind: 'man', row: 3, col: 2 }
    ];

    const move = chooseAiMove({
      difficulty: 'medium',
      board,
      currentPlayer: 'black',
      forcedPieceId: null
    });

    expect(move?.algorithm).toBe('astar');
    expect(move?.from).toEqual({ row: 2, col: 1 });
    expect(move?.to).toEqual({ row: 4, col: 3 });
  });

  test('continues a multiple capture with the forced piece', () => {
    const board: CheckersPiece[] = [
      { id: 'black-1', color: 'black', kind: 'man', row: 4, col: 3 },
      { id: 'red-1', color: 'red', kind: 'man', row: 5, col: 4 },
      { id: 'black-2', color: 'black', kind: 'man', row: 2, col: 1 },
      { id: 'red-2', color: 'red', kind: 'man', row: 3, col: 2 }
    ];

    const move = chooseAiMove({
      difficulty: 'hard',
      board,
      currentPlayer: 'black',
      forcedPieceId: 'black-1'
    });

    expect(move?.from).toEqual({ row: 4, col: 3 });
    expect(move?.to).toEqual({ row: 6, col: 5 });
  });
});
