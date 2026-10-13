import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../apps/api/scripts/live-agent-lifecycle.mjs', import.meta.url));
const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Node syntax validation failed\n');
  process.exit(result.status ?? 1);
}
console.log('LIVE RUNNER SYNTAX PASS');
