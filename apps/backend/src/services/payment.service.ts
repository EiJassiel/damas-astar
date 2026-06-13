import { createHmac, timingSafeEqual } from 'node:crypto';
import { collections } from '../db/mongo';
import { getAuthUserFromToken } from '../utils/auth';
import { AppError } from '../utils/errors';

type CheckoutSessionResponse = {
  id?: string;
  url?: string;
  error?: { message?: string };
};

type CosmeticItem = {
  id: string;
  kind: 'boardTheme' | 'pieceStyle';
  value: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
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
        userId?: string;
        email?: string;
        itemId?: string;
        itemKind?: string;
        itemValue?: string;
      };
    };
  };
};

const stripeApi = 'https://api.stripe.com/v1';

const cosmeticCatalog: CosmeticItem[] = [
  {
    id: 'board-wood',
    kind: 'boardTheme',
    value: 'wood',
    name: 'Tablero Madera',
    description: 'Tema de tablero con acabado de madera.',
    priceCents: 299,
    currency: 'usd'
  },
  {
    id: 'board-neon',
    kind: 'boardTheme',
    value: 'neon',
    name: 'Tablero Torneo',
    description: 'Tema de tablero moderno con contraste alto.',
    priceCents: 399,
    currency: 'usd'
  },
  {
    id: 'piece-flat',
    kind: 'pieceStyle',
    value: 'flat',
    name: 'Fichas Planas',
    description: 'Estilo visual de fichas planas.',
    priceCents: 249,
    currency: 'usd'
  },
  {
    id: 'piece-marble',
    kind: 'pieceStyle',
    value: 'marble',
    name: 'Fichas Piedra',
    description: 'Estilo visual de fichas con acabado de piedra.',
    priceCents: 349,
    currency: 'usd'
  }
];

export function listCosmeticItems() {
  return cosmeticCatalog;
}

export async function createPremiumCheckout(authToken: string, itemId: string) {
  const user = await getAuthUserFromToken(authToken);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new AppError('Falta STRIPE_SECRET_KEY en el backend.', 500);

  const item = cosmeticCatalog.find((candidate) => candidate.id === itemId);
  if (!item) throw new AppError('Producto no encontrado.', 404);
  if (isAlreadyUnlocked(user, item)) throw new AppError('Ese cosmetico ya esta desbloqueado.', 409);

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${frontendUrl}/premium?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${frontendUrl}/premium?canceled=1`;
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? successUrl
      : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: user.email,
    client_reference_id: user.userId,
    'metadata[userId]': user.userId,
    'metadata[email]': user.email,
    'metadata[itemId]': item.id,
    'metadata[itemKind]': item.kind,
    'metadata[itemValue]': item.value,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': item.currency,
    'line_items[0][price_data][unit_amount]': String(item.priceCents),
    'line_items[0][price_data][product_data][name]': item.name,
    'line_items[0][price_data][product_data][description]': item.description
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
  const user = await getAuthUserFromToken(authToken);
  return getPremiumStatusByUserId(user.userId);
}

export async function getPremiumStatusByUserId(userId: string) {
  const { users } = await collections();
  const stored = await users.findOne({ userId });
  return {
    premium: Boolean(stored?.premium),
    premiumSince: stored?.premiumSince ?? null,
    purchasedCosmetics: stored?.purchasedCosmetics ?? []
  };
}

export async function verifyPremiumCheckout(authToken: string, sessionId: string) {
  const user = await getAuthUserFromToken(authToken);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new AppError('Falta STRIPE_SECRET_KEY en el backend.', 500);

  const response = await fetch(`${stripeApi}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const session = (await response.json()) as {
    id?: string;
    payment_status?: string;
    client_reference_id?: string;
    customer_email?: string;
    metadata?: {
      userId?: string;
      email?: string;
      itemId?: string;
      itemKind?: string;
      itemValue?: string;
    };
    error?: { message?: string };
  };
  if (!response.ok || !session.id) {
    throw new AppError(session.error?.message ?? 'No se pudo verificar el pago en Stripe.', 502, session);
  }

  const sessionUserId = session.metadata?.userId ?? session.client_reference_id;
  if (sessionUserId && sessionUserId !== user.userId) throw new AppError('Este pago pertenece a otra cuenta.', 403);

  if (session.payment_status === 'paid') {
    await applyPurchase({
      userId: user.userId,
      email: session.metadata?.email ?? session.customer_email ?? user.email,
      sessionId: session.id,
      itemId: session.metadata?.itemId,
      itemKind: session.metadata?.itemKind,
      itemValue: session.metadata?.itemValue
    });
  }

  const status = await getPremiumStatusByUserId(user.userId);
  return { ...status, paymentStatus: session.payment_status ?? 'unknown', verified: true };
}

export async function handleStripeWebhook(payload: string, signature: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new AppError('Falta STRIPE_WEBHOOK_SECRET en el backend.', 500);
  if (!signature) throw new AppError('Webhook sin firma de Stripe.', 400);
  verifyStripeSignature(payload, signature, webhookSecret);

  const event = JSON.parse(payload) as StripeCheckoutCompleted | { type: string };
  if (isCheckoutCompleted(event)) {
    const session = event.data.object;
    await applyPurchase({
      userId: session.metadata?.userId ?? session.client_reference_id,
      email: session.metadata?.email ?? session.customer_email,
      sessionId: session.id,
      itemId: session.metadata?.itemId,
      itemKind: session.metadata?.itemKind,
      itemValue: session.metadata?.itemValue
    });
  }
  return { received: true };
}

function isCheckoutCompleted(event: StripeCheckoutCompleted | { type: string }): event is StripeCheckoutCompleted {
  return event.type === 'checkout.session.completed';
}

async function applyPurchase({
  userId,
  email,
  sessionId,
  itemId,
  itemKind,
  itemValue
}: {
  userId?: string;
  email?: string;
  sessionId: string;
  itemId?: string;
  itemKind?: string;
  itemValue?: string;
}) {
  if (!userId && !email) throw new AppError('Webhook Stripe sin userId ni email.', 400);
  if (!itemId || !itemKind || !itemValue) throw new AppError('Compra sin metadatos del cosmetico.', 400);

  const { users } = await collections();
  const now = new Date();
  const query = userId ? { userId } : { email: email?.toLowerCase() };
  const existing = await users.findOne(query);
  if (!existing) throw new AppError('No se encontro el usuario para activar la compra.', 404);

  const purchasedCosmetics = new Set(existing.purchasedCosmetics ?? []);
  purchasedCosmetics.add(itemId);
  const unlockedThemes = new Set(existing.unlockedThemes);
  const unlockedPieceStyles = new Set(existing.unlockedPieceStyles);

  if (itemKind === 'boardTheme') unlockedThemes.add(itemValue as 'classic' | 'wood' | 'neon');
  if (itemKind === 'pieceStyle') unlockedPieceStyles.add(itemValue as 'sphere' | 'flat' | 'marble');

  await users.replaceOne(query, {
    ...existing,
    premium: true,
    premiumSince: existing.premiumSince ?? now,
    stripeCheckoutSessionId: sessionId,
    purchasedCosmetics: [...purchasedCosmetics],
    unlockedThemes: [...unlockedThemes],
    unlockedPieceStyles: [...unlockedPieceStyles],
    updatedAt: now
  });
}

function isAlreadyUnlocked(
  user: Awaited<ReturnType<typeof getAuthUserFromToken>>,
  item: CosmeticItem
) {
  if (item.kind === 'boardTheme') return user.unlockedThemes.includes(item.value as 'classic' | 'wood' | 'neon');
  return user.unlockedPieceStyles.includes(item.value as 'sphere' | 'flat' | 'marble');
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
