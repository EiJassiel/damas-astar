import type { ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { api } from '../services/api';

const AUTH_FAILURE_PATTERNS = [
  'sesion expirada',
  'sesion invalida',
  'sesion google invalida',
  'sesion google requerida',
  'session expired',
  'token expired'
] as const;

export function normalizeAuthText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function isAuthFailureMessage(message: string) {
  const normalized = normalizeAuthText(message);
  return AUTH_FAILURE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === 'SESSION_EXPIRED';
  }
  if (error instanceof Error) return isAuthFailureMessage(error.message);
  if (typeof error === 'string') return isAuthFailureMessage(error);
  return false;
}

export function SessionExpiredNotice({ next, compact }: { next?: string; compact?: boolean }) {
  const returnPath =
    next ??
    (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/');

  return (
    <div className={`session-expired${compact ? ' compact' : ''}`} role="alert">
      <p>
        <strong>Sesion expirada.</strong> Vuelve a iniciar sesion con Google.
      </p>
      <a className="primary-button session-expired-cta" href={api.googleLoginUrl(returnPath)}>
        <LogIn size={18} />
        Iniciar sesion de nuevo
      </a>
    </div>
  );
}

export function resolveFormError(error: unknown): ReactNode {
  if (isAuthSessionError(error)) {
    return <SessionExpiredNotice compact />;
  }
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la accion.';
}

/** @deprecated use isAuthFailureMessage */
export function isSessionExpiredMessage(message: string) {
  return isAuthFailureMessage(message);
}
