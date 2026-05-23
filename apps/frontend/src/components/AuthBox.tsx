import { LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuthUser } from '../context/AuthContext';
import { SessionExpiredNotice } from './SessionExpiredNotice';

export function AuthBox({ next }: { next: string }) {
  const { authUser, sessionExpired, logout } = useAuthUser();

  if (sessionExpired || !authUser) {
    if (sessionExpired) {
      return <SessionExpiredNotice next={next} compact />;
    }
    return (
      <a className="google-button" href={api.googleLoginUrl(next)}>
        <ShieldCheck size={18} />
        Continuar con Google
      </a>
    );
  }

  return (
    <div className="google-session">
      <ShieldCheck size={18} aria-hidden="true" />
      <span>{authUser.email}</span>
      <button type="button" className="google-session-logout" onClick={logout}>
        <LogOut size={14} aria-hidden="true" />
        Cerrar sesion
      </button>
    </div>
  );
}
