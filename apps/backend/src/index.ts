import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { connectMongo } from './db/mongo';
import { authRoutes } from './routes/auth.routes';
import { checkersRoutes } from './routes/checkers.routes';
import { paymentRoutes } from './routes/payment.routes';
import { AppError } from './utils/errors';
import { recordHttpRequest, renderMetrics } from './utils/metrics';

const app = new Hono();

app.use('*', logger());
app.use('*', async (c, next) => {
  const correlationId = c.req.header('x-correlation-id') ?? crypto.randomUUID();
  c.header('x-correlation-id', correlationId);
  await next();
});
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-correlation-id']
  })
);
app.use('*', async (c, next) => {
  await next();
  const ok = c.res.status < 400;
  recordHttpRequest(ok);
});

app.get('/health', (c) => c.json({ ok: true, service: 'damas-backend' }));
app.get('/metrics', (c) => c.text(renderMetrics(), 200, { 'Content-Type': 'text/plain; version=0.0.4' }));
app.route('/api/auth', authRoutes);
app.route('/api/checkers', checkersRoutes);
app.route('/api/payments', paymentRoutes);

app.onError((err, c) => {
  console.error(err);
  recordHttpRequest(false);
  if (err instanceof ZodError) return c.json({ error: 'Payload invalido.', details: err.issues }, 400);
  if (err instanceof AppError) return c.json({ error: err.message, details: err.details }, err.status as 400 | 401 | 403 | 404 | 409 | 500);
  return c.json({ error: 'Error inesperado.' }, 500);
});

const port = Number(process.env.PORT ?? 3001);
await connectMongo();

export default {
  port,
  fetch: app.fetch
};

console.log(`Damas backend on http://localhost:${port}`);
