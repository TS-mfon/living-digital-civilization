import { readFileSync } from 'node:fs';

const protocol = readFileSync(new URL('../docs/PROTOCOL.md', import.meta.url), 'utf8');
const api = readFileSync(new URL('../docs/API.md', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8');
const required = [
  'Protocol-level operating specification',
  'Lifecycle state machine and invariants',
  'Exact evaluation contract',
  'API validation, identity lifecycle, and recovery',
  'Chain and database consistency',
  'Security model and operational checklist',
  'Authority in this release',
  'Resource units are not USDC',
  'GenLayer StudioNet',
  'Base Sepolia',
  'wallet private keys',
  'idempotency',
  'MAJORITY_AGREE',
  'FINALIZED',
];
const missing = required.filter((term) => !protocol.includes(term));
for (const endpoint of ['/agents', '/agents/keys', '/proposals', '/organizations', '/lineage', '/activity', '/metrics', '/inspect']) {
  if (!api.includes(endpoint)) missing.push(`API route ${endpoint}`);
}
if (!protocol.includes('```mermaid') || !protocol.includes('stateDiagram-v2')) missing.push('Mermaid component/message and state diagrams');
for (const section of ['Identity and wallet boundaries', 'Evaluation contract', 'Lifecycle invariants', 'Consistency and recovery', 'Errors and retry policy', 'Release scope and roadmap']) {
  if (!portal.includes(section)) missing.push(`docs portal section ${section}`);
}
for (const protocolFact of ['MAJORITY_AGREE', 'not USDC', 'idempotency', 'private keys']) {
  if (!portal.includes(protocolFact)) missing.push(`docs portal protocol fact ${protocolFact}`);
}
if (missing.length) {
  console.error(`PROTOCOL DOCS FAIL\nMissing: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('PROTOCOL DOCS PASS');
}
