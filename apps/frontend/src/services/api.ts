import type { BattleState, PokemonCatalogItem, RoomState } from '../types/battle';

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const API_URL = resolveApiUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export const api = {
  googleLoginUrl: (next = '/') => `${API_URL}/api/auth/google?next=${encodeURIComponent(next)}`,
  createRoom: (playerAuthToken: string) =>
    request<{ code: string; playerId: string }>('/api/rooms', { method: 'POST', body: JSON.stringify({ playerAuthToken }) }),
  createSoloRoom: (playerAuthToken: string) =>
    request<{ code: string; playerId: string }>('/api/rooms/solo', { method: 'POST', body: JSON.stringify({ playerAuthToken }) }),
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

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') return null;
  const user = decodeAuthToken(token);
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
  return user;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('authToken');
  const raw = localStorage.getItem('authUser');
  if (!token || !raw) return null;
  try {
    return { ...JSON.parse(raw), token } as AuthUser;
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    return null;
  }
}

export function clearAuthUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
}

function decodeAuthToken(token: string): Omit<AuthUser, 'token'> {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Token Google invalido.');
  const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
  const data = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture
  };
}
