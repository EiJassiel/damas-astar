import type {
  CheckersBotDifficulty,
  CheckersColor,
  CheckersMove,
  CheckersPiece
} from '../types/checkers.types';
import { recordAiCall } from '../utils/metrics';

const aiAstarUrl = () => process.env.AI_ASTAR_SERVICE_URL ?? 'http://localhost:3004';

export type AiMoveMeta = {
  algorithm: 'astar';
  evaluationScore: number;
  pathLength?: number;
  nodesExplored?: number;
  pathsEvaluated?: number;
  goalCount?: number;
  computeTimeMs?: number;
  goal?: { row: number; col: number };
};

export async function requestAiMove(input: {
  difficulty: CheckersBotDifficulty;
  board: CheckersPiece[];
  currentPlayer: CheckersColor;
  forcedPieceId?: string | null;
  correlationId?: string;
}): Promise<{ move: CheckersMove; meta: AiMoveMeta } | null> {
  const serviceUrl = aiAstarUrl();
  const started = performance.now();
  try {
    const res = await fetch(`${serviceUrl}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.correlationId ? { 'x-correlation-id': input.correlationId } : {})
      },
      body: JSON.stringify({
        difficulty: input.difficulty,
        board: input.board,
        currentPlayer: input.currentPlayer,
        forcedPieceId: input.forcedPieceId ?? null
      })
    });
    const data = await res.json().catch(() => ({}));
    recordAiCall(performance.now() - started);
    if (!res.ok) {
      console.error(`[ai-client] astar respondio ${res.status} desde ${serviceUrl}`);
      return null;
    }
    if (data.algorithm && data.algorithm !== 'astar') {
      console.error(`[ai-client] respuesta con algoritmo ${data.algorithm}, se esperaba astar`);
      return null;
    }
    return {
      move: { from: data.from, to: data.to },
      meta: {
        algorithm: 'astar',
        evaluationScore: Number(data.evaluationScore ?? 0),
        pathLength: typeof data.pathLength === 'number' ? data.pathLength : undefined,
        nodesExplored: typeof data.nodesExplored === 'number' ? data.nodesExplored : undefined,
        pathsEvaluated: typeof data.pathsEvaluated === 'number' ? data.pathsEvaluated : undefined,
        goalCount: typeof data.goalCount === 'number' ? data.goalCount : undefined,
        computeTimeMs: typeof data.computeTimeMs === 'number' ? data.computeTimeMs : undefined,
        goal: data.goal
      }
    };
  } catch (error) {
    recordAiCall(performance.now() - started);
    console.error('[ai-client]', error);
    return null;
  }
}
