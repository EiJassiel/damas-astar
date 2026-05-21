import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { connectMongo } from './db/mongo';
import { authRoutes } from './routes/auth.routes';
import { battleRoutes } from './routes/battle.routes';
import { importRoutes } from './routes/import.routes';
import { paymentRoutes } from './routes/payment.routes';
import { pokemonRoutes } from './routes/pokemon.routes';
import { roomRoutes } from './routes/room.routes';
import { AppError } from './utils/errors';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
);

app.get('/health', (c) => c.json({ ok: true, service: 'pokemon-battle-rooms-backend' }));
app.route('/api/auth', authRoutes);
app.route('/api/import', importRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/pokemon', pokemonRoutes);
app.route('/api/rooms', roomRoutes);
app.route('/api/battles', battleRoutes);

app.onError((err, c) => {
  console.error(err);
  if (err instanceof ZodError) return c.json({ error: 'Payload invalido.', details: err.issues }, 400);
  if (err instanceof AppError) return c.json({ error: err.message, details: err.details }, err.status as any);
  return c.json({ error: 'Error inesperado.' }, 500);
});

const port = Number(process.env.PORT ?? 3001);
await connectMongo();

export default {
  port,
  fetch: app.fetch
};

console.log(`Pokemon Battle Rooms backend on http://localhost:${port}`);
