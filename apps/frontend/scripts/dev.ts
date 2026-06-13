import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freePort } from './free-port';

const port = '3000';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

freePort(port);

const result = spawnSync('bun', ['x', 'vite', '--port', port], {
  cwd: root,
  stdio: 'inherit',
  shell: true
});

process.exit(result.status ?? 1);
