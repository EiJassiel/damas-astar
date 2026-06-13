export type GridPos = { row: number; col: number };

export type AstarResult = {
  path: GridPos[];
  pathLength: number;
  nodesExplored: number;
  goal: GridPos;
};

type Node = {
  key: string;
  pos: GridPos;
  g: number;
  f: number;
  parent?: Node;
};

const BOARD_SIZE = 8;

export function astarPath(
  start: GridPos,
  goal: GridPos,
  isBlocked: (pos: GridPos) => boolean,
  neighbors: (pos: GridPos) => GridPos[]
): AstarResult | null {
  const startKey = keyOf(start);
  const goalKey = keyOf(goal);
  if (startKey === goalKey) {
    return { path: [start], pathLength: 0, nodesExplored: 0, goal };
  }

  const open = new Map<string, Node>();
  const closed = new Set<string>();
  const startNode: Node = { key: startKey, pos: start, g: 0, f: heuristic(start, goal) };
  open.set(startKey, startNode);
  let nodesExplored = 0;

  while (open.size > 0) {
    const current = [...open.values()].sort((a, b) => a.f - b.f || a.g - b.g)[0];
    open.delete(current.key);
    closed.add(current.key);
    nodesExplored += 1;

    if (current.key === goalKey) {
      const path: GridPos[] = [];
      let cursor: Node | undefined = current;
      while (cursor) {
        path.unshift(cursor.pos);
        cursor = cursor.parent;
      }
      return { path, pathLength: path.length - 1, nodesExplored, goal };
    }

    for (const next of neighbors(current.pos)) {
      const nextKey = keyOf(next);
      if (closed.has(nextKey) || isBlocked(next)) continue;
      const g = current.g + 1;
      const existing = open.get(nextKey);
      if (existing && existing.g <= g) continue;
      open.set(nextKey, {
        key: nextKey,
        pos: next,
        g,
        f: g + heuristic(next, goal),
        parent: current
      });
    }
  }

  return null;
}

export function heuristic(a: GridPos, b: GridPos) {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

export function isPlayable(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && (row + col) % 2 === 1;
}

function keyOf(pos: GridPos) {
  return `${pos.row}:${pos.col}`;
}
