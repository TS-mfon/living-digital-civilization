import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDir = mkdtempSync(join(tmpdir(), 'ldc-vercel-body-'));
process.env.DATABASE_PATH = join(testDir, 'api.sqlite');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;

const { app } = await import('../src/server.js');
const { db } = await import('../src/db.js');
type VercelRequest = IncomingMessage & { body?: unknown };
type Handler = (request: VercelRequest, response: ServerResponse) => Promise<void>;
function unwrap(module: { default: unknown }): Handler {
  const entry = module.default as Handler | { default: Handler };
  return typeof entry === 'function' ? entry : entry.default;
}
const dispatch = unwrap(await import('../../../api/[...route].js'));
const inspect = unwrap(await import('../../../api/v1/inspect/[reference].js'));
const server = createServer((request: VercelRequest, response) => {
  void (async () => {
    // Match Vercel: parse incoming JSON but retain the original wire headers.
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (chunks.length) request.body = JSON.parse(Buffer.concat(chunks).toString());
    const handler = request.url?.startsWith('/api/v1/inspect/') ? inspect : dispatch;
    await handler(request, response);
  })().catch((error: unknown) => { response.destroy(error as Error); });
});
let origin: string;

before(async () => {
  await app.ready();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await app.close();
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

test('Vercel parsed JSON accepts whitespace and escaped Unicode with the original Content-Length', async () => {
  const name = 'Civic \u00e9quipe';
  const payload = JSON.stringify({ name }, null, 2).replace('\u00e9', '\\u00e9');
  assert.notEqual(Buffer.byteLength(payload), Buffer.byteLength(JSON.stringify({ name })));
  const response = await fetch(`${origin}/api/v1/agents`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: payload,
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, 201, await response.clone().text());
  const issued = await response.json() as { agent: { name: string }; apiKey: string };
  assert.equal(issued.agent.name, name);
  const invalid = await fetch(`${origin}/api/v1/proposals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${issued.apiKey}` },
    body: JSON.stringify({ action: 'create', allocation: -1 }, null, 2),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json() as { error: string }).error, 'invalid_request');
});

test('the Vercel inspection entrypoint returns API validation and missing-reference errors', async () => {
  for (const [reference, status, error] of [['invalid', 400, 'invalid_request'], ['00000000-0000-0000-0000-000000000000', 404, 'not_found']] as const) {
    const response = await fetch(`${origin}/api/v1/inspect/${reference}`, { signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.equal((await response.json() as { error: string }).error, error);
  }
});
