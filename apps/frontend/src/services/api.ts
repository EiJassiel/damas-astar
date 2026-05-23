import type { BattleState, PokemonCatalogItem, RoomState } from '../types/battle';

export class AuthSessionError extends Error {
  readonly code = 'SESSION_EXPIRED';

  constructor(message = 'Sesion expirada.') {
    super(message);
    this.name = 'AuthSessionError';
  }
}

const AUTH_ERROR_MARKERS = [
  'sesion expirada',
  'sesion invalida',
  'sesion google invalida',
  'sesion google requerida',
  'session expired'
] as const;

function normalizeAuthText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function isAuthErrorMessage(message: string) {
  const normalized = normalizeAuthText(message);
  return AUTH_ERROR_MARKERS.some((marker) => normalized.includes(marker));
}

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const API_URL = resolveApiUrl();

function dispatchSessionExpired(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('auth:session-expired', {
      detail: { message, path: `${window.location.pathname}${window.location.search}` }
    })
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  const errorMessage = typeof data.error === 'string' ? data.error : 'Request failed';

  if (!res.ok) {
    if (isAuthErrorMessage(errorMessage)) {
      clearAuthUser('expired');
      dispatchSessionExpired(errorMessage);
      throw new AuthSessionError(errorMessage);
    }
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  googleLoginUrl: (next = '/') => `${API_URL}/api/auth/google?next=${encodeURIComponent(next)}`,
  createRoom: (playerAuthToken: string) =>
    request<{ code: string; playerId: string }>('/api/rooms', { method: 'POST', body: JSON.stringify({ playerAuthToken }) }),
  joinRoom: (code: string, playerAuthToken: string) =>
    request<{ code: string; playerId: string }>(`/api/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ playerAuthToken }) }),
  getRoom: (code: string) => request<RoomState>(`/api/rooms/${code}`),
  getPokemon: (params: { search?: string; type?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value && search.set(key, String(value)));
    return request<{ items: PokemonCatalogItem[]; total: number; page: number; limit: number }>(`/api/pokemon?${search}`);
  },
  setTeam: (code: string, playerId: string, pokemonIds: string[]) =>
    request<RoomState>(`/api/rooms/${code}/team`, { method: 'POST', body: JSON.stringify({ playerId, pokemonIds }) }),
  startBattle: (code: string, playerId: string) =>
    request<BattleState>(`/api/rooms/${code}/start`, { method: 'POST', body: JSON.stringify({ playerId }) }),
  getBattle: (code: string) => request<BattleState>(`/api/battles/${code}`),
  action: (code: string, action: Record<string, unknown>) =>
    request<BattleState>(`/api/battles/${code}/action`, { method: 'POST', body: JSON.stringify(action) }),
  forfeitBattle: (code: string, playerId: string) =>
    request<BattleState>(`/api/battles/${code}/forfeit`, { method: 'POST', body: JSON.stringify({ playerId }) }),
  createPremiumCheckout: (authToken: string) =>
    request<{ checkoutUrl: string; sessionId?: string }>('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ authToken }) }),
  getPremiumStatus: (authToken: string) =>
    request<{ premium: boolean; premiumSince: string | null }>('/api/payments/status', { method: 'POST', body: JSON.stringify({ authToken }) }),
  verifyPremiumCheckout: (authToken: string, sessionId: string) =>
    request<{ premium: boolean; premiumSince: string | null; paymentStatus: string; verified: boolean }>(
      '/api/payments/verify',
      { method: 'POST', body: JSON.stringify({ authToken, sessionId }) }
    ),
  getAuthProfile: (authToken: string) =>
    request<{ user: Omit<AuthUser, 'token'>; premium: boolean; premiumSince: string | null }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    }),
  importPokemon: () => request('/api/import/pokemon', { method: 'POST', body: JSON.stringify({ limit: 300 }) })
};

export type AuthUser = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  token: string;
};

export function saveSession(session: { code: string; playerId: string; playerName: string; playerEmail?: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('roomCode', session.code);
  localStorage.setItem('playerId', session.playerId);
  localStorage.setItem('playerName', session.playerName);
  if (session.playerEmail) localStorage.setItem('playerEmail', session.playerEmail);
}

export function getSession() {
  if (typeof window === 'undefined') {
    return { code: '', playerId: '', playerName: '', playerEmail: '' };
  }
  return {
    code: localStorage.getItem('roomCode') ?? '',
    playerId: localStorage.getItem('playerId') ?? '',
    playerName: localStorage.getItem('playerName') ?? '',
    playerEmail: localStorage.getItem('playerEmail') ?? ''
  };
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('roomCode');
  localStorage.removeItem('playerId');
  localStorage.removeItem('playerName');
  localStorage.removeItem('playerEmail');
}

export function notifyAuthUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:updated'));
}

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') return null;
  if (isAuthTokenExpired(token)) throw new Error('El token recibido ya expiro.');
  const user = decodeAuthToken(token);
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
  sessionStorage.removeItem('authExpiredNotice');
  notifyAuthUpdated();
  return user;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('authToken');
  const raw = localStorage.getItem('authUser');
  if (!token || !raw) return null;

  if (isAuthTokenExpired(token)) {
    clearAuthUser('expired');
    dispatchSessionExpired('Sesion expirada.');
    return null;
  }

  try {
    return { ...JSON.parse(raw), token } as AuthUser;
  } catch {
    clearAuthUser('invalid');
    return null;
  }
}

export function clearAuthUser(reason?: 'expired' | 'invalid') {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  if (reason === 'expired') {
    sessionStorage.setItem('authExpiredNotice', '1');
  } else {
    sessionStorage.removeItem('authExpiredNotice');
  }
}

export function consumeAuthExpiredNotice() {
  if (typeof window === 'undefined') return false;
  const flagged = sessionStorage.getItem('authExpiredNotice') === '1';
  sessionStorage.removeItem('authExpiredNotice');
  return flagged;
}

export function isAuthTokenExpired(token: string) {
  try {
    const payload = readJwtPayload(token);
    if (!payload.exp) return false;
    return payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function getAuthTokenRemainingMs(token: string) {
  try {
    const payload = readJwtPayload(token);
    if (!payload.exp) return null;
    return Math.max(0, payload.exp * 1000 - Date.now());
  } catch {
    return 0;
  }
}

function readJwtPayload(token: string): { exp?: number } {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Token invalido.');
  const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
  return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
}

function decodeAuthToken(token: string): Omit<AuthUser, 'token'> {
  const data = readJwtPayload(token) as {
    sub: string;
    email: string;
    name: string;
    picture?: string;
  };
  if (!data.sub || !data.email || !data.name) throw new Error('Token Google invalido.');
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture
  };
}
