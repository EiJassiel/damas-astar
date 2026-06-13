import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { chooseAiMove } from './engine';
import { recordMoveRequest, renderMetrics } from './metrics';

const app = new Hono();

app.use('*', logger());
app.use('*', async (c, next) => {
  const correlationId = c.req.header('x-correlation-id') ?? crypto.randomUUID();
  c.header('x-correlation-id', correlationId);
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'damas-ai-astar',
    algorithm: 'astar',
    logic: 'pure-astar-pathfinding-only'
  })
);
app.get('/metrics', (c) => c.text(renderMetrics(), 200, { 'Content-Type': 'text/plain; version=0.0.4' }));

const moveSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  board: z.array(
    z.object({
      id: z.string(),
      color: z.enum(['red', 'black']),
      kind: z.enum(['man', 'king']),
      row: z.number().int().min(0).max(7),
      col: z.number().int().min(0).max(7)
    })
  ),
  currentPlayer: z.enum(['red', 'black']),
  forcedPieceId: z.string().nullable().optional()
});

app.post('/move', async (c) => {
  const started = performance.now();
  try {
    const body = moveSchema.parse(await c.req.json());
    const move = chooseAiMove(body);
    if (!move) {
      recordMoveRequest(performance.now() - started, false);
      return c.json({ error: 'No hay movimientos legales para la IA.' }, 409);
    }
    recordMoveRequest(performance.now() - started, true);
    return c.json(move);
  } catch (error) {
    recordMoveRequest(performance.now() - started, false);
    console.error('[ai-astar-service]', error);
    return c.json({ error: 'Solicitud invalida para IA A*.' }, 400);
  }
});

const port = Number(process.env.PORT ?? 3004);
export default { port, fetch: app.fetch };
console.log(`Damas A* AI service on http://localhost:${port}`);
