import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthToken } from '../services/auth.service';
import { createBattleRoom, createSoloBattleRoom, getRoom, joinBattleRoom, setTeam, startRoomBattle } from '../services/room.service';
import { AppError } from '../utils/errors';

export const roomRoutes = new Hono();

const playerSchema = z.object({
  playerAuthToken: z.string().min(1)
});
const teamSchema = z.object({
  playerId: z.string().min(1),
  pokemonIds: z.array(z.string()).min(1).max(6)
});

roomRoutes.post('/', async (c) => {
  const body = playerSchema.parse(await c.req.json());
  const player = resolvePlayer(body);
  return c.json(await createBattleRoom(player.name, player.email), 201);
});

roomRoutes.post('/solo', async (c) => {
  const body = playerSchema.parse(await c.req.json());
  const player = resolvePlayer(body);
  return c.json(await createSoloBattleRoom(player.name, player.email), 201);
});

roomRoutes.post('/:code/join', async (c) => {
  const body = playerSchema.parse(await c.req.json());
  const player = resolvePlayer(body);
  return c.json(await joinBattleRoom(c.req.param('code'), player.name, player.email));
});

roomRoutes.get('/:code', async (c) => c.json(await getRoom(c.req.param('code'))));

roomRoutes.post('/:code/team', async (c) => {
  const body = teamSchema.parse(await c.req.json());
  return c.json(await setTeam(c.req.param('code'), body.playerId, body.pokemonIds));
});

roomRoutes.post('/:code/start', async (c) => {
  const body = z.object({ playerId: z.string().min(1) }).parse(await c.req.json());
  return c.json(await startRoomBattle(c.req.param('code'), body.playerId));
});

function resolvePlayer(body: z.infer<typeof playerSchema>) {
  const googleUser = verifyAuthToken(body.playerAuthToken);
  if (!googleUser) throw new AppError('Sesion Google requerida.', 401);
  return { name: googleUser.name.slice(0, 24), email: googleUser.email };
}
