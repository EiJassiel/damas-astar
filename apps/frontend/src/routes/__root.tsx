import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { Crown, LogOut, UserCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import '../styles.css';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Damas Online' }
    ]
  }),
  component: Root
});

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <div className="app-shell">
            <div className="grain-overlay" aria-hidden="true" />
            <TopBar />
            <Outlet />
          </div>
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function TopBar() {
  const { authUser, logout } = useAuth();
  return (
    <header className="app-topbar">
      {authUser ? (
        <>
          <span className="app-topbar-user">{authUser.name}</span>
          <Link className="app-topbar-link" to="/profile">
            <UserCircle size={16} />
            Perfil
          </Link>
          <Link className="app-topbar-link" to="/premium">
            <Crown size={16} />
            Tienda
          </Link>
          <button className="app-topbar-link" onClick={logout} type="button">
            <LogOut size={16} />
            Salir
          </button>
        </>
      ) : (
        <>
          <Link className="app-topbar-link" to="/login">Entrar</Link>
          <Link className="app-topbar-link app-topbar-cta" to="/register">Crear cuenta</Link>
        </>
      )}
    </header>
  );
}
