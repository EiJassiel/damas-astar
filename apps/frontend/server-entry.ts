// Production server entry for TanStack Start (Bun adapter)
import { serve } from 'bun';

// @ts-ignore — generated at build time
const { default: handler } = await import('./dist/server/server.js');

const port = Number(process.env.PORT ?? 3000);

serve({
  port,
  fetch: handler.fetch
});

console.log(`Frontend on http://localhost:${port}`);
