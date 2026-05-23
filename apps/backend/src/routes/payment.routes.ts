import { Hono } from 'hono';
import { z } from 'zod';
import { createPremiumCheckout, getPremiumStatus, handleStripeWebhook, verifyPremiumCheckout } from '../services/payment.service';

export const paymentRoutes = new Hono();

const authSchema = z.object({
  authToken: z.string().min(1)
});

const verifySchema = z.object({
  authToken: z.string().min(1),
  sessionId: z.string().min(1)
});

paymentRoutes.post('/checkout', async (c) => {
  const body = authSchema.parse(await c.req.json());
  return c.json(await createPremiumCheckout(body.authToken));
});

paymentRoutes.post('/status', async (c) => {
  const body = authSchema.parse(await c.req.json());
  return c.json(await getPremiumStatus(body.authToken));
});

paymentRoutes.post('/verify', async (c) => {
  const body = verifySchema.parse(await c.req.json());
  return c.json(await verifyPremiumCheckout(body.authToken, body.sessionId));
});

paymentRoutes.post('/webhook', async (c) => {
  const payload = await c.req.text();
  return c.json(await handleStripeWebhook(payload, c.req.header('stripe-signature') ?? null));
});
