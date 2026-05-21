import { Hono } from 'hono';
import { z } from 'zod';
import { forfeitBattle, getBattle, parseBattleAction, submitAction } from '../services/battle.service';

export const battleRoutes = new Hono();

battleRoutes.get('/:code', async (c) => c.json(await getBattle(c.req.param('code'))));

battleRoutes.post('/:code/action', async (c) => {
  const action = parseBattleAction(await c.req.json());
  return c.json(await submitAction(c.req.param('code'), action));
});

battleRoutes.post('/:code/forfeit', async (c) => {
  const body = z.object({ playerId: z.string().min(1) }).parse(await c.req.json());
  return c.json(await forfeitBattle(c.req.param('code'), body.playerId));
});
