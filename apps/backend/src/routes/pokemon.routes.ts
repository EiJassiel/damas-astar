import { Hono } from 'hono';
import { getPokemon, getPokemonCatalog } from '../services/pokemon.service';

export const pokemonRoutes = new Hono();

pokemonRoutes.get('/', async (c) => {
  const query = c.req.query();
  return c.json(await getPokemonCatalog(query));
});

pokemonRoutes.get('/:id', async (c) => c.json(await getPokemon(c.req.param('id'))));
