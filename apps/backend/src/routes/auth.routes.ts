import { Hono } from 'hono';
import { z } from 'zod';
import { getUserProfile, loginUser, registerUser, updateUserProfile } from '../services/auth.service';
import { requireAuth } from '../utils/auth';

export const authRoutes = new Hono();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128)
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1).max(48)
});

const profileSchema = z.object({
  name: z.string().min(1).max(48).optional(),
  boardTheme: z.enum(['classic', 'neon', 'wood']).optional(),
  pieceStyle: z.enum(['sphere', 'flat', 'marble']).optional()
});

authRoutes.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json());
  return c.json(await registerUser(body.name, body.email, body.password), 201);
});

authRoutes.post('/login', async (c) => {
  const body = credentialsSchema.parse(await c.req.json());
  return c.json(await loginUser(body.email, body.password));
});

authRoutes.get('/me', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  return c.json(await getUserProfile(authUser.userId));
});

authRoutes.patch('/profile', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const body = profileSchema.parse(await c.req.json());
  const user = await updateUserProfile(authUser.userId, body);
  return c.json({ user });
});
