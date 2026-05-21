import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors';

type JwtPayload = Record<string, unknown> & {
  exp?: number;
};

const encoder = new TextEncoder();

const secret = () => process.env.JWT_SECRET ?? 'dev-pokemon-battle-rooms-secret';

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function signPart(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function signJwt(payload: JwtPayload, expiresInSeconds = 60 * 60 * 8) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const signature = signPart(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyJwt<T extends JwtPayload>(token: string): T {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new AppError('Sesion invalida.', 401);

  const expected = signPart(`${header}.${body}`);
  const left = encoder.encode(signature);
  const right = encoder.encode(expected);
  if (left.byteLength !== right.byteLength || !timingSafeEqual(left, right)) throw new AppError('Sesion invalida.', 401);

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new AppError('Sesion expirada.', 401);
  return payload;
}
