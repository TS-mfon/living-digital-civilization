import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { civilizationEvents } from '../src/protocol/eventBus.js';

const testDir = mkdtempSync(join(tmpdir(), 'ldc-stream-'));
process.env.DATABASE_PATH = join(testDir, 'api.sqlite');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'https://observer.example';
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;

const { app } = await import('../src/server.js');
const { db } = await import('../src/db.js');
const routeModule = await import('../../../api/[...route].js');
type Handler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;
const routeExport = routeModule.default as Handler | { default: Handler };
const handler = typeof routeExport === 'function' ? routeExport : routeExport.default;
let pendingHandlers = 0;
const server = createServer((request, response) => {
  pendingHandlers += 1;
  void handler(request, response).finally(() => { pendingHandlers -= 1; });
});
let baseUrl: string;

before(async () => {
  await app.ready();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await app.close();
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await sleep(10);
  }
  assert.ok(predicate(), 'condition did not become true before the deadline');
}

for (const path of ['/api/v1/stream', '/v1/stream?client=test']) {
  test(`Vercel ${path} streams after request completion and cleans up on disconnect`, { timeout: 10_000 }, async (context) => {
    const originalSubscribe = civilizationEvents.subscribe;
    let subscribers = 0;
    context.mock.method(civilizationEvents, 'subscribe', (listener: Parameters<typeof originalSubscribe>[0]) => {
      subscribers += 1;
      const unsubscribe = originalSubscribe(listener);
      return () => { subscribers -= 1; unsubscribe(); };
    });
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = httpRequest(`${baseUrl}${path}`, { headers: { origin: 'https://observer.example' } }, resolve);
      request.once('error', reject);
      context.after(() => request.destroy());
      request.end();
    });
    context.after(() => response.destroy());
    let output = '';
    response.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'text/event-stream; charset=utf-8');
    assert.equal(response.headers['access-control-allow-origin'], 'https://observer.example');
    assert.equal(response.headers['cache-control'], 'no-cache, no-transform');
    assert.equal(response.headers['x-ratelimit-limit'], '120');
    await waitUntil(() => output.includes(': connected\n\n'));
    await sleep(30);
    assert.equal(response.complete, false);
    assert.equal(pendingHandlers, 1);
    assert.equal(subscribers, 1);
    civilizationEvents.publish({ event: 'agent.registered', detail: '{}', proposalId: null, organizationId: null, createdAt: '2026-10-15T00:00:00.000Z' });
    await waitUntil(() => output.includes('agent.registered'));
    assert.match(output, /event: civilization\ndata: .*agent\.registered/);
    response.destroy();
    await waitUntil(() => subscribers === 0 && pendingHandlers === 0);
  });
}

test('non-stream requests still use the JSON adapter and HEAD never opens an SSE connection', async () => {
  const health = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json() as { mode: string }).mode, 'demo');
  const head = await fetch(`${baseUrl}/api/v1/stream`, { method: 'HEAD', signal: AbortSignal.timeout(2_000) });
  assert.equal(head.status, 404);
  const unauthorized = await fetch(`${baseUrl}/api/v1/agents/me`);
  assert.equal(unauthorized.status, 401);
});

test('Vercel streams enforce the Fastify rate limit instead of bypassing middleware', async () => {
  for (let attempt = 0; attempt < 121; attempt += 1) {
    await app.inject({ method: 'GET', url: '/v1/agents', remoteAddress: '127.0.0.1' });
  }
  const response = await fetch(`${baseUrl}/api/v1/stream`, { signal: AbortSignal.timeout(2_000) });
  assert.equal(response.status, 429);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  await response.text();
  await waitUntil(() => pendingHandlers === 0);
});
