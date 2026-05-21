import { Hono } from 'hono';
import { importPokemon } from '../services/import.service';

export const importRoutes = new Hono();

importRoutes.post('/pokemon', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await importPokemon(Number(body.limit ?? 300));
  return c.json(result);
});
