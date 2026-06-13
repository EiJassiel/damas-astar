import { execSync } from 'node:child_process';

export function freePort(port: string) {
  if (process.platform !== 'win32') return;

  try {
    const output = execSync(`netstat -ano | findstr ":${port}" | findstr LISTENING`, { encoding: 'utf8' });
    const pids = new Set<string>();
    for (const line of output.split(/\r?\n/)) {
      const match = line.trim().match(/(\d+)\s*$/);
      if (match && match[1] !== '0') pids.add(match[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[dev] Puerto ${port} liberado (PID ${pid}).`);
      } catch {
        // already gone
      }
    }
  } catch {
    // port already free
  }
}

if (import.meta.main) {
  freePort(process.argv[2] ?? '3000');
}
