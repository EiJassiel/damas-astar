import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { AccountBar } from '../components/AccountBar';
import { AuthProvider } from '../context/AuthContext';
import '../styles.css';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Pokemon Battle Rooms' }
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
            <AccountBar />
            <Outlet />
          </div>
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}
