import { Hono } from 'hono';
import { z } from 'zod';
import {
  addBotToCheckersRoom,
  createCheckersRoom,
  createGuestCheckersRoom,
  getCheckersGame,
  getCheckersLeaderboard,
  getCheckersRoom,
  joinCheckersRoom,
  listUserGames,
  makeCheckersMove,
  playCheckersBotTurn,
  resignCheckersGame,
  restartCheckersGame,
  startCheckersGame
} from '../services/checkers.service';
import { AppError } from '../utils/errors';
import { getAuthUserFromToken, readBearerToken, requireAuth } from '../utils/auth';

export const checkersRoutes = new Hono();

const difficultySchema = z.enum(['easy', 'medium', 'hard']).default('medium');
const createSchema = z.object({
  difficulty: difficultySchema.optional()
});
const botSchema = z.object({
  difficulty: difficultySchema.optional()
});
const moveSchema = z.object({
  playerId: z.string().min(1),
  from: z.object({ row: z.number().int().min(0).max(7), col: z.number().int().min(0).max(7) }),
  to: z.object({ row: z.number().int().min(0).max(7), col: z.number().int().min(0).max(7) })
});
const playerIdSchema = z.object({ playerId: z.string().min(1) });
const actorSchema = z.object({ playerId: z.string().min(1).optional() });

function correlationId(c: { req: { header: (name: string) => string | undefined } }) {
  return c.req.header('x-correlation-id') ?? crypto.randomUUID();
}

async function resolveRoomActor(c: { req: { header: (name: string) => string | undefined } }, body?: { playerId?: string }) {
  const token = readBearerToken(c.req.header('authorization'));
  if (token) {
    try {
      const authUser = await getAuthUserFromToken(token);
      return { userId: authUser.userId, playerId: body?.playerId };
    } catch {
      // fall through to guest actor when token is invalid
    }
  }
  if (!body?.playerId) throw new AppError('playerId requerido para invitado.', 400);
  return { playerId: body.playerId };
}

checkersRoutes.post('/rooms', requireAuth, async (c) => {
  const body = createSchema.parse(await c.req.json().catch(() => ({})));
  const authUser = c.get('authUser');
  return c.json(await createCheckersRoom(authUser, body.difficulty ?? 'medium'), 201);
});

checkersRoutes.post('/rooms/guest', async (c) => {
  const body = createSchema.parse(await c.req.json().catch(() => ({})));
  return c.json(await createGuestCheckersRoom(body.difficulty ?? 'medium'), 201);
});

checkersRoutes.post('/rooms/:code/join', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const code = c.req.param('code') ?? '';
  return c.json(await joinCheckersRoom(code, authUser));
});

checkersRoutes.get('/rooms/:code', async (c) => c.json(await getCheckersRoom(c.req.param('code'))));

checkersRoutes.post('/rooms/:code/bot', async (c) => {
  const body = botSchema.extend({ playerId: z.string().min(1).optional() }).parse(await c.req.json().catch(() => ({})));
  const actor = await resolveRoomActor(c, body);
  const code = c.req.param('code') ?? '';
  return c.json(await addBotToCheckersRoom(code, actor, body.difficulty ?? 'medium'));
});

checkersRoutes.post('/rooms/:code/start', async (c) => {
  const body = actorSchema.parse(await c.req.json().catch(() => ({})));
  const actor = await resolveRoomActor(c, body);
  const code = c.req.param('code') ?? '';
  return c.json(await startCheckersGame(code, actor));
});

checkersRoutes.post('/rooms/:code/restart', async (c) => {
  const body = actorSchema.parse(await c.req.json().catch(() => ({})));
  const actor = await resolveRoomActor(c, body);
  const code = c.req.param('code') ?? '';
  return c.json(await restartCheckersGame(code, actor));
});

checkersRoutes.get('/games/mine', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  return c.json(await listUserGames(authUser.userId));
});

checkersRoutes.get('/games/:code', async (c) => c.json(await getCheckersGame(c.req.param('code'))));

checkersRoutes.post('/games/:code/move', async (c) => {
  const body = moveSchema.parse(await c.req.json());
  return c.json(await makeCheckersMove(c.req.param('code'), body.playerId, { from: body.from, to: body.to }, correlationId(c)));
});

checkersRoutes.post('/games/:code/bot-turn', async (c) => {
  return c.json(await playCheckersBotTurn(c.req.param('code'), correlationId(c)));
});

checkersRoutes.post('/games/:code/resign', async (c) => {
  const body = playerIdSchema.parse(await c.req.json());
  return c.json(await resignCheckersGame(c.req.param('code'), body.playerId));
});

checkersRoutes.get('/leaderboard', async (c) => {
  const limit = Number(c.req.query('limit') ?? 10);
  const sort = (c.req.query('sort') ?? 'rating') as 'rating' | 'wins' | 'winRate';
  return c.json(await getCheckersLeaderboard(limit, sort));
});
