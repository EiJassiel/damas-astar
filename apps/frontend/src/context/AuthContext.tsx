import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, AuthSessionError, clearAuth, getAuthUser } from '../services/api';
import type { AuthUser } from '../types/checkers';

type AuthContextValue = {
  authUser: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const cached = getAuthUser();
    if (!cached) {
      setAuthUser(null);
      return;
    }
    setLoading(true);
    try {
      const profile = await api.getProfile();
      setAuthUser(profile.user);
      localStorage.setItem('authUser', JSON.stringify(profile.user));
    } catch (err) {
      if (err instanceof AuthSessionError) {
        clearAuth();
        setAuthUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthUser(null);
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdated = () => {
      setAuthUser(getAuthUser());
    };
    window.addEventListener('auth:updated', onUpdated);
    return () => window.removeEventListener('auth:updated', onUpdated);
  }, [refresh]);

  const value = useMemo(() => ({ authUser, loading, refresh, logout }), [authUser, loading, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
