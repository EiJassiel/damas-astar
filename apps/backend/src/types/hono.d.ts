import type { AuthUser } from './auth.types';

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}
