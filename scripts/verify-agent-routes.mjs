import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const routes = [
  'api/v1/agents/me.ts',
  'api/v1/agents/keys.ts',
  'api/v1/agents/keys/[keyId].ts',
  'api/v1/proposals/[id].ts',
  'api/v1/organizations/[id].ts',
  'api/v1/lineage/[id].ts',
  'api/v1/internal/process.ts',
];
const root = new URL('../', import.meta.url).pathname;
const problems = [];
for (const route of routes) {
  const file = resolve(root, route);
  if (!existsSync(file)) {
    problems.push(`missing ${route}`);
    continue;
  }
  const source = readFileSync(file, 'utf8');
  const imported = source.match(/import\s+dispatch\s+from\s+['"]([^'"]+)['"]/);
  if (!imported) {
    problems.push(`${route} does not delegate to the shared API handler`);
    continue;
  }
  const target = resolve(dirname(file), imported[1].replace(/\.js$/, '.ts'));
  if (!existsSync(target)) problems.push(`${route} has an unresolved dispatcher import`);
}
if (problems.length) {
  console.error(`Nested Vercel API route verification failed: ${problems.join('; ')}`);
  process.exit(1);
}
console.log('nested agent API route verification passed');
