// Starts Expo against the local Supabase stack so nothing touches production.
// Usage: npm run dev:local -- [expo start args]   (e.g. -- --web)
// Set LOCAL_SUPABASE_HOST to your LAN IP when testing on a physical device.
import { execFileSync, spawn } from 'node:child_process';

let env = null;
try {
  const status = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const start = status.search(/^\{/m);
  env = start >= 0 ? JSON.parse(status.slice(start)) : null;
} catch {
  // `supabase status` fails when the stack is down; handled below.
}

if (!env?.API_URL || !env?.PUBLISHABLE_KEY) {
  console.error('Local Supabase is not running. Start it first: npm run supabase:start');
  process.exit(1);
}

const host = process.env.LOCAL_SUPABASE_HOST;
const apiUrl = host ? env.API_URL.replace('127.0.0.1', host) : env.API_URL;

console.log(`Using local Supabase at ${apiUrl}`);

const child = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: apiUrl,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.PUBLISHABLE_KEY,
  },
});
child.on('exit', (code) => process.exit(code ?? 0));
