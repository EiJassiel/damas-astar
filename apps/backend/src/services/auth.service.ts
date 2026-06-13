import { randomUUID } from 'node:crypto';
import { collections } from '../db/mongo';
import type { BoardTheme, PieceStyle, UserDocument } from '../types/auth.types';
import { AppError } from '../utils/errors';
import { hashPassword, signUserToken, toAuthUser, verifyPassword } from '../utils/auth';

const DEFAULT_THEMES: BoardTheme[] = ['classic'];
const DEFAULT_PIECES: PieceStyle[] = ['sphere'];

export async function registerUser(name: string, email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().slice(0, 48) || 'Jugador';
  if (password.length < 6) throw new AppError('La contrasena debe tener al menos 6 caracteres.', 400);

  const { users } = await collections();
  const existing = await users.findOne({ email: cleanEmail });
  if (existing) throw new AppError('Ya existe una cuenta con ese correo.', 409);

  const now = new Date();
  const user: UserDocument = {
    userId: randomUUID(),
    name: cleanName,
    email: cleanEmail,
    passwordHash: await hashPassword(password),
    boardTheme: 'classic',
    pieceStyle: 'sphere',
    unlockedThemes: [...DEFAULT_THEMES],
    unlockedPieceStyles: [...DEFAULT_PIECES],
    createdAt: now,
    updatedAt: now
  };
  await users.insertOne(user);
  const token = signUserToken(user);
  return { token, user: toAuthUser(user) };
}

export async function loginUser(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { users } = await collections();
  const user = (await users.findOne({ email: cleanEmail })) as UserDocument | null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('Correo o contrasena incorrectos.', 401);
  }
  return { token: signUserToken(user), user: toAuthUser(user) };
}

export async function getUserProfile(userId: string) {
  const { users, scores } = await collections();
  const user = (await users.findOne({ userId })) as UserDocument | null;
  if (!user) throw new AppError('Usuario no encontrado.', 404);
  const stats = (await scores.findOne({ userId })) ?? null;
  return { user: toAuthUser(user), stats };
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<{ name: string; boardTheme: BoardTheme; pieceStyle: PieceStyle }>
) {
  const { users } = await collections();
  const user = (await users.findOne({ userId })) as UserDocument | null;
  if (!user) throw new AppError('Usuario no encontrado.', 404);

  if (patch.name) user.name = patch.name.trim().slice(0, 48) || user.name;
  if (patch.boardTheme) {
    if (!user.unlockedThemes.includes(patch.boardTheme)) throw new AppError('Tema de tablero bloqueado.', 403);
    user.boardTheme = patch.boardTheme;
  }
  if (patch.pieceStyle) {
    if (!user.unlockedPieceStyles.includes(patch.pieceStyle)) throw new AppError('Estilo de ficha bloqueado.', 403);
    user.pieceStyle = patch.pieceStyle;
  }
  user.updatedAt = new Date();
  await users.replaceOne({ userId }, user);
  return toAuthUser(user);
}

export async function unlockCosmeticsForUser(userId: string, wins: number) {
  const { users } = await collections();
  const user = (await users.findOne({ userId })) as UserDocument | null;
  if (!user) return;
  const themes = new Set(user.unlockedThemes);
  const pieces = new Set(user.unlockedPieceStyles);
  if (wins >= 2) themes.add('wood');
  if (wins >= 4) themes.add('neon');
  if (wins >= 3) pieces.add('flat');
  if (wins >= 6) pieces.add('marble');
  user.unlockedThemes = [...themes];
  user.unlockedPieceStyles = [...pieces];
  user.updatedAt = new Date();
  await users.replaceOne({ userId }, user);
}
