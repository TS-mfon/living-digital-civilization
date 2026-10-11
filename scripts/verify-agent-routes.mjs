import { existsSync } from 'node:fs';

const routes = [
  'api/v1/agents/me.ts',
  'api/v1/agents/keys.ts',
  'api/v1/agents/keys/[keyId].ts',
  'api/v1/proposals/[id].ts',
  'api/v1/organizations/[id].ts',
  'api/v1/lineage/[id].ts',
  'api/v1/internal/process.ts',
];
const missing = routes.filter((route) => !existsSync(new URL(`../${route}`, import.meta.url)));
if (missing.length) {
  console.error(`Missing explicit Vercel API routes: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('nested agent API route verification passed');
