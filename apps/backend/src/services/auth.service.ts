import { randomUUID } from 'node:crypto';
import { collections } from '../db/mongo';
import type { AuthUser } from '../types/auth.types';
import { AppError } from '../utils/errors';
import { signJwt, verifyJwt } from '../utils/jwt';

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
};

const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const googleTokenUrl = 'https://oauth2.googleapis.com/token';
const googleUserInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function getFrontendUrl() {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000';
}

export function getGoogleLoginUrl(next = '/') {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3001/api/auth/google/callback';
  if (!clientId) throw new AppError('Falta GOOGLE_CLIENT_ID en el backend.', 500);

  const state = signJwt({ nonce: randomUUID(), next: normalizeNext(next) }, 10 * 60);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state
  });
  return `${googleAuthUrl}?${params}`;
}

export async function handleGoogleCallback(code: string, state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3001/api/auth/google/callback';
  if (!clientId || !clientSecret) throw new AppError('Faltan credenciales Google OAuth en el backend.', 500);

  const statePayload = verifyJwt<{ next?: string }>(state);
  const tokenRes = await fetch(googleTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new AppError(tokenData.error_description ?? 'Google no devolvio token valido.', 401, tokenData);
  }

  const profileRes = await fetch(googleUserInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = (await profileRes.json()) as GoogleUserInfo;
  if (!profileRes.ok || !profile.email || !profile.id) throw new AppError('No se pudo leer el perfil de Google.', 401);
  if (profile.verified_email === false) throw new AppError('Google no marco este correo como verificado.', 401);

  const user: AuthUser = {
    googleId: profile.id,
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() || profile.email.split('@')[0],
    picture: profile.picture
  };
  await upsertUser(user);

  const token = signAuthToken(user);
  return `${getFrontendUrl()}/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(normalizeNext(statePayload.next))}`;
}

export function signAuthToken(user: AuthUser) {
  return signJwt({ sub: user.googleId, email: user.email, name: user.name, picture: user.picture }, 60 * 60 * 24);
}

export function verifyAuthToken(token?: string | null): AuthUser | null {
  if (!token) return null;
  const payload = verifyJwt<{ sub: string; email: string; name: string; picture?: string }>(token);
  if (!payload.sub || !payload.email || !payload.name) throw new AppError('Sesion Google invalida.', 401);
  return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name, picture: payload.picture };
}

async function upsertUser(user: AuthUser) {
  const { users } = await collections();
  const now = new Date();
  await users.updateOne(
    { googleId: user.googleId },
    {
      $set: { email: user.email, name: user.name, picture: user.picture, updatedAt: now },
      $setOnInsert: { googleId: user.googleId, createdAt: now }
    },
    { upsert: true }
  );
}

function normalizeNext(next = '/') {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
