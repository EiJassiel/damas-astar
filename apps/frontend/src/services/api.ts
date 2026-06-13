import type {
  AiAlgorithm,
  AuthUser,
  CheckersGameState,
  CheckersPiece,
  CheckersRoomState,
  LeaderboardEntry,
  SavedGameSummary,
  UserStats
} from '../types/checkers';

export class AuthSessionError extends Error {
  readonly code = 'SESSION_EXPIRED';
  constructor(message = 'Sesion expirada.') {
    super(message);
    this.name = 'AuthSessionError';
  }
}

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3001`;
  return 'http://localhost:3001';
}

const API_URL = resolveApiUrl();

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('authToken') ?? '';
}

function isLoggedIn() {
  return Boolean(getToken());
}

async function request<T>(path: string, init?: RequestInit, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined)
  };
  if (auth) {
    const token = getToken();
    if (!token) throw new AuthSessionError('Sesion requerida.');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  const errorMessage = typeof data.error === 'string' ? data.error : 'Request failed';

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      throw new AuthSessionError(errorMessage);
    }
    throw new Error(errorMessage);
  }
  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getProfile: () => request<{ user: AuthUser; stats: UserStats | null }>('/api/auth/me', undefined, true),
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'boardTheme' | 'pieceStyle'>>) =>
    request<{ user: AuthUser }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(patch) }, true),
  createPremiumCheckout: () =>
    request<{ checkoutUrl: string; sessionId?: string }>('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ authToken: getToken() })
    }),
  getPremiumStatus: () =>
    request<{ premium: boolean; premiumSince?: string | null }>('/api/payments/status', {
      method: 'POST',
      body: JSON.stringify({ authToken: getToken() })
    }),
  verifyPremiumCheckout: (sessionId: string) =>
    request<{ premium: boolean; premiumSince?: string | null; paymentStatus: string; verified: boolean }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ authToken: getToken(), sessionId })
    }),
  createCheckersRoom: (difficulty: 'easy' | 'medium' | 'hard') =>
    request<{ code: string; playerId: string; playerName: string; saved: boolean }>(
      '/api/checkers/rooms',
      { method: 'POST', body: JSON.stringify({ difficulty }) },
      true
    ),
  createGuestCheckersRoom: (difficulty: 'easy' | 'medium' | 'hard') =>
    request<{ code: string; playerId: string; playerName: string; saved: boolean }>(
      '/api/checkers/rooms/guest',
      { method: 'POST', body: JSON.stringify({ difficulty }) }
    ),
  joinCheckersRoom: (code: string) =>
    request<{ code: string; playerId: string; playerName: string }>(`/api/checkers/rooms/${code}/join`, { method: 'POST' }, true),
  addCheckersBot: (code: string, difficulty: 'easy' | 'medium' | 'hard', playerId?: string) =>
    request<CheckersRoomState>(`/api/checkers/rooms/${code}/bot`, {
      method: 'POST',
      body: JSON.stringify({ difficulty, ...(playerId ? { playerId } : {}) })
    }, isLoggedIn()),
  getCheckersRoom: (code: string) => request<CheckersRoomState>(`/api/checkers/rooms/${code}`),
  startCheckersGame: (code: string, playerId?: string) =>
    request<CheckersGameState>(`/api/checkers/rooms/${code}/start`, {
      method: 'POST',
      body: JSON.stringify(playerId ? { playerId } : {})
    }, isLoggedIn()),
  restartCheckersGame: (code: string, playerId?: string) =>
    request<CheckersGameState>(`/api/checkers/rooms/${code}/restart`, {
      method: 'POST',
      body: JSON.stringify(playerId ? { playerId } : {})
    }, isLoggedIn()),
  listMyGames: () => request<SavedGameSummary[]>('/api/checkers/games/mine', undefined, true),
  getCheckersLeaderboard: (limit = 10, sort: 'rating' | 'wins' | 'winRate' = 'rating') =>
    request<LeaderboardEntry[]>(`/api/checkers/leaderboard?limit=${limit}&sort=${sort}`),
  getCheckersGame: (code: string) => request<CheckersGameState>(`/api/checkers/games/${code}`),
  playCheckersBotTurn: (code: string) => request<CheckersGameState>(`/api/checkers/games/${code}/bot-turn`, { method: 'POST' }),
  moveCheckersPiece: (code: string, playerId: string, from: { row: number; col: number }, to: { row: number; col: number }) =>
    request<CheckersGameState>(`/api/checkers/games/${code}/move`, {
      method: 'POST',
      body: JSON.stringify({ playerId, from, to })
    }),
  resignCheckersGame: (code: string, playerId: string) =>
    request<CheckersGameState>(`/api/checkers/games/${code}/resign`, { method: 'POST', body: JSON.stringify({ playerId }) })
};

export function saveAuth(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('auth:updated'));
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('authUser');
  if (!raw || !localStorage.getItem('authToken')) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.dispatchEvent(new CustomEvent('auth:updated'));
}

export function saveSession(session: { code: string; playerId: string; playerName: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('roomCode', session.code);
  localStorage.setItem('playerId', session.playerId);
  localStorage.setItem('playerName', session.playerName);
}

export function getSession() {
  if (typeof window === 'undefined') return { code: '', playerId: '', playerName: '' };
  return {
    code: localStorage.getItem('roomCode') ?? '',
    playerId: localStorage.getItem('playerId') ?? '',
    playerName: localStorage.getItem('playerName') ?? ''
  };
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('roomCode');
  localStorage.removeItem('playerId');
  localStorage.removeItem('playerName');
}
