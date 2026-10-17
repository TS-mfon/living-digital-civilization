import { readFileSync } from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
for(const token of ['push:','pull_request:','pnpm install --frozen-lockfile','pnpm build','pnpm test','pnpm mcp:test','foundry-rs/foundry-toolchain']) if(!workflow.includes(token)) throw new Error(`CI workflow missing ${token}`);
if (workflow.indexOf('pnpm/action-setup') > workflow.indexOf('actions/setup-node')) throw new Error('pnpm must be installed before setup-node initializes its cache');
if (!workflow.includes('pip install genvm-linter==') || workflow.includes('if command -v genvm-lint')) throw new Error('CI must install and run the GenLayer linter, not silently skip it');
console.log('CI WORKFLOW PASS');
