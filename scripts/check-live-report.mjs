import { readFileSync } from 'node:fs';

const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Usage: node scripts/check-live-report.mjs <request-log.jsonl> [more-logs.jsonl ...]');
const rows = paths.flatMap((path) => {
  const raw = readFileSync(path, 'utf8').trim();
  return raw.split('\n').map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`Invalid JSONL at ${path}:${index + 1}`); }
  });
});
const forbiddenCredential = /ldc_[0-9a-f-]+\.[A-Za-z0-9_-]{20,}/;
function containsSecret(value, key = '') {
  if (typeof value === 'string') {
    return forbiddenCredential.test(value) || (/^(api[-_]?key|private[-_]?key|secret|password|authorization)$/i.test(key) && !/^<redacted>$/i.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsSecret(item, key));
  if (value && typeof value === 'object') return Object.entries(value).some(([childKey, childValue]) => containsSecret(childValue, childKey));
  return false;
}
for (const [index, row] of rows.entries()) {
  if (!row.agent || !row.request?.method || !row.request?.url) throw new Error(`Missing request metadata at line ${index + 1}`);
  if (!Object.hasOwn(row, 'status') || !row.response_headers || !Object.hasOwn(row, 'response_payload')) throw new Error(`Missing response outcome at line ${index + 1}`);
  if (JSON.stringify(row.request.headers ?? {}).toLowerCase().includes('bearer ')) throw new Error(`Unredacted Authorization header at line ${index + 1}`);
  if (containsSecret(row)) throw new Error(`Credential material requires review at line ${index + 1}`);
  if (row.status === null && (!row.transport_error || row.server_received !== false)) throw new Error(`Unexplained transport failure at line ${index + 1}`);
  if (typeof row.status === 'number' && row.server_received === false) throw new Error(`HTTP response incorrectly marked not received at line ${index + 1}`);
}
console.log('LIVE REPORT PASS');
