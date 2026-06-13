import type { Context, Next } from 'hono';
import { collections } from '../db/mongo';
import type { AuthUser, UserDocument } from '../types/auth.types';
import { AppError } from './errors';
import { signJwt, verifyJwt } from './jwt';

type AuthPayload = { sub: string; email: string; name: string };

export async function hashPassword(password: string) {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
}

export async function verifyPassword(password: string, hash: string) {
  return Bun.password.verify(password, hash);
}

export function signUserToken(user: Pick<UserDocument, 'userId' | 'email' | 'name'>) {
  return signJwt({ sub: user.userId, email: user.email, name: user.name }, 60 * 60 * 24 * 7);
}

export function verifyUserToken(token: string | null | undefined): AuthPayload {
  if (!token) throw new AppError('Sesion requerida.', 401);
  const payload = verifyJwt<AuthPayload>(token);
  if (!payload.sub) throw new AppError('Sesion invalida.', 401);
  return payload;
}

export function readBearerToken(header: string | undefined) {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

export async function getAuthUserFromToken(token: string | null | undefined): Promise<AuthUser> {
  const payload = verifyUserToken(token);
  const { users } = await collections();
  const user = (await users.findOne({ userId: payload.sub })) as UserDocument | null;
  if (!user) throw new AppError('Usuario no encontrado.', 401);
  return toAuthUser(user);
}

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    boardTheme: user.boardTheme,
    pieceStyle: user.pieceStyle,
    unlockedThemes: user.unlockedThemes,
    unlockedPieceStyles: user.unlockedPieceStyles,
    premium: Boolean(user.premium),
    premiumSince: user.premiumSince ?? null,
    purchasedCosmetics: user.purchasedCosmetics ?? []
  };
}

export async function requireAuth(c: Context, next: Next) {
  const token = readBearerToken(c.req.header('authorization'));
  c.set('authUser', await getAuthUserFromToken(token));
  await next();
}
