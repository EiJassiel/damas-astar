import { createHmac, timingSafeEqual } from 'node:crypto';
import { collections } from '../db/mongo';
import { verifyAuthToken } from './auth.service';
import { AppError } from '../utils/errors';

type CheckoutSessionResponse = {
  id?: string;
  url?: string;
  error?: { message?: string };
};

type StripeCheckoutCompleted = {
  id: string;
  type: 'checkout.session.completed';
  data: {
    object: {
      id: string;
      client_reference_id?: string;
      customer_email?: string;
      metadata?: {
        googleId?: string;
        email?: string;
      };
    };
  };
};

const stripeApi = 'https://api.stripe.com/v1';

export async function createPremiumCheckout(authToken: string) {
  const user = verifyAuthToken(authToken);
  if (!user) throw new AppError('Sesion Google requerida.', 401);

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new AppError('Falta STRIPE_SECRET_KEY en el backend.', 500);

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const unitAmount = process.env.STRIPE_PREMIUM_AMOUNT ?? '499';
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: process.env.STRIPE_SUCCESS_URL ?? `${frontendUrl}/premium/success`,
    cancel_url: process.env.STRIPE_CANCEL_URL ?? `${frontendUrl}/premium/cancel`,
    customer_email: user.email,
    client_reference_id: user.googleId,
    'metadata[googleId]': user.googleId,
    'metadata[email]': user.email,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': process.env.STRIPE_PREMIUM_CURRENCY ?? 'usd',
    'line_items[0][price_data][unit_amount]': unitAmount,
    'line_items[0][price_data][product_data][name]': 'Trainer Premium Pass',
    'line_items[0][price_data][product_data][description]': 'Cosmetic arcade perks for Pokemon Battle Rooms'
  });

  const response = await fetch(`${stripeApi}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = (await response.json()) as CheckoutSessionResponse;
  if (!response.ok || !data.url) throw new AppError(data.error?.message ?? 'Stripe no pudo crear el checkout.', 502, data);
  return { checkoutUrl: data.url, sessionId: data.id };
}

export async function getPremiumStatus(authToken: string) {
  const user = verifyAuthToken(authToken);
  if (!user) throw new AppError('Sesion Google requerida.', 401);
  const { users } = await collections();
  const stored = await users.findOne({ googleId: user.googleId });
  return {
    premium: Boolean(stored?.premium),
    premiumSince: stored?.premiumSince ?? null
  };
}

export async function handleStripeWebhook(payload: string, signature: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new AppError('Falta STRIPE_WEBHOOK_SECRET en el backend.', 500);
  if (!signature) throw new AppError('Webhook sin firma de Stripe.', 400);
  verifyStripeSignature(payload, signature, webhookSecret);

  const event = JSON.parse(payload) as StripeCheckoutCompleted | { type: string };
  if (isCheckoutCompleted(event)) {
    const session = event.data.object;
    await markPremium({
      googleId: session.metadata?.googleId ?? session.client_reference_id,
      email: session.metadata?.email ?? session.customer_email,
      sessionId: session.id
    });
  }
  return { received: true };
}

function isCheckoutCompleted(event: StripeCheckoutCompleted | { type: string }): event is StripeCheckoutCompleted {
  return event.type === 'checkout.session.completed';
}

async function markPremium({ googleId, email, sessionId }: { googleId?: string; email?: string; sessionId: string }) {
  const { users } = await collections();
  const now = new Date();
  const filter = googleId ? { googleId } : { email };
  await users.updateOne(
    filter,
    {
      $set: {
        premium: true,
        premiumSince: now,
        stripeCheckoutSessionId: sessionId,
        updatedAt: now
      }
    }
  );
}

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=') as [string, string]));
  const timestamp = parts.t;
  const signed = parts.v1;
  if (!timestamp || !signed) throw new AppError('Firma Stripe invalida.', 400);

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const left = Buffer.from(signed, 'hex');
  const right = Buffer.from(expected, 'hex');
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new AppError('Firma Stripe no coincide.', 400);
}
