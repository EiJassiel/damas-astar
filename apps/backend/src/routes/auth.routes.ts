import { Hono } from 'hono';
import { getGoogleLoginUrl, handleGoogleCallback, verifyAuthToken } from '../services/auth.service';
import { getPremiumStatusByGoogleId } from '../services/payment.service';
import { AppError } from '../utils/errors';

export const authRoutes = new Hono();

authRoutes.get('/google', (c) => c.redirect(getGoogleLoginUrl(c.req.query('next'))));

authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) throw new AppError('Google OAuth no devolvio code/state.', 400);
  return c.redirect(await handleGoogleCallback(code, state));
});

authRoutes.get('/me', async (c) => {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  const user = verifyAuthToken(token);
  if (!user) throw new AppError('No hay sesion Google.', 401);
  const premium = await getPremiumStatusByGoogleId(user.googleId);
  return c.json({ user, ...premium });
});
