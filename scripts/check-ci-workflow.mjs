import { readFileSync } from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
for(const token of ['push:','pull_request:','pnpm install --frozen-lockfile','pnpm build','pnpm test','pnpm mcp:test','foundry-rs/foundry-toolchain']) if(!workflow.includes(token)) throw new Error(`CI workflow missing ${token}`);
console.log('CI WORKFLOW PASS');
