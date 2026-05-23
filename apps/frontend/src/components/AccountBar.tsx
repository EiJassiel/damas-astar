import { Crown, LogOut, ShieldCheck } from 'lucide-react';
import { useAuthUser } from '../context/AuthContext';

export function AccountBar() {
  const { authUser, premium, sessionExpired, logout } = useAuthUser();

  if (!authUser || sessionExpired) return null;

  return (
    <div className={`account-bar${premium ? ' account-bar-premium' : ''}`}>
      <div className="account-bar-user">
        {premium ? <Crown size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
        <span className="account-bar-email">{authUser.email}</span>
        {premium && <span className="account-bar-badge">Premium</span>}
      </div>
      <button type="button" className="account-bar-logout" onClick={logout}>
        <LogOut size={14} aria-hidden="true" />
        Cerrar sesion
      </button>
    </div>
  );
}
