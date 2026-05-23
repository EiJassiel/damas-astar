import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, AuthSessionError, type AuthUser, clearAuthUser, getAuthUser } from '../services/api';

type AuthContextValue = {
  authUser: AuthUser | null;
  premium: boolean;
  premiumSince: string | null;
  premiumLoading: boolean;
  sessionExpired: boolean;
  refresh: () => void;
  refreshPremium: () => Promise<void>;
  logout: () => void;
  markSessionExpired: () => void;
  dismissExpiredNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readExpiredFlag() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('authExpiredNotice') === '1';
}

function consumeExpiredFlag() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authExpiredNotice');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  const [premium, setPremium] = useState(false);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(() => readExpiredFlag());

  const refreshPremium = useCallback(async () => {
    const user = getAuthUser();
    if (!user) {
      setPremium(false);
      setPremiumSince(null);
      return;
    }
    setPremiumLoading(true);
    try {
      const profile = await api.getAuthProfile(user.token);
      setPremium(profile.premium);
      setPremiumSince(profile.premiumSince);
    } catch (err) {
      if (err instanceof AuthSessionError) return;
      try {
        const status = await api.getPremiumStatus(user.token);
        setPremium(status.premium);
        setPremiumSince(status.premiumSince);
      } catch {
        setPremium(false);
        setPremiumSince(null);
      }
    } finally {
      setPremiumLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    const user = getAuthUser();
    setAuthUser(user);
    if (user) {
      setSessionExpired(false);
      consumeExpiredFlag();
      void refreshPremium();
      return;
    }
    setPremium(false);
    setPremiumSince(null);
    if (readExpiredFlag()) {
      setSessionExpired(true);
      consumeExpiredFlag();
    }
  }, [refreshPremium]);

  const logout = useCallback(() => {
    clearAuthUser();
    setAuthUser(null);
    setPremium(false);
    setPremiumSince(null);
    setSessionExpired(false);
    consumeExpiredFlag();
  }, []);

  const markSessionExpired = useCallback(() => {
    clearAuthUser('expired');
    setAuthUser(null);
    setPremium(false);
    setPremiumSince(null);
    setSessionExpired(true);
  }, []);

  const dismissExpiredNotice = useCallback(() => {
    setSessionExpired(false);
    consumeExpiredFlag();
  }, []);

  useEffect(() => {
    refresh();
    const onExpired = () => {
      markSessionExpired();
      consumeExpiredFlag();
    };
    const onUpdated = () => refresh();
    window.addEventListener('auth:session-expired', onExpired);
    window.addEventListener('auth:updated', onUpdated);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auth:session-expired', onExpired);
      window.removeEventListener('auth:updated', onUpdated);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh, markSessionExpired]);

  const value = useMemo(
    () => ({
      authUser,
      premium,
      premiumSince,
      premiumLoading,
      sessionExpired,
      refresh,
      refreshPremium,
      logout,
      markSessionExpired,
      dismissExpiredNotice
    }),
    [authUser, premium, premiumSince, premiumLoading, sessionExpired, refresh, refreshPremium, logout, markSessionExpired, dismissExpiredNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthUser must be used within AuthProvider');
  return context;
}
