import assert from 'node:assert/strict';

const origin = (process.env.LDC_ORIGIN ?? 'https://living-digital-civilization.vercel.app').replace(/\/$/, '');
for (const path of ['/', '/monitor', '/inspect', '/docs', '/archive']) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/, path);
  assert.match(await response.text(), /<div id="root"><\/div>/, path);
  console.log(`PAGE PASS ${path}`);
}
for (const [path, property] of [['/v1/health', 'ok'], ['/v1/metrics', 'totalOrganizations'], ['/v1/organizations', 'organizations'], ['/v1/agents', 'agents'], ['/v1/activity?limit=5', 'events']]) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, path);
  const body = await response.json();
  assert.ok(Object.hasOwn(body, property), `${path} missing ${property}`);
  if (path === '/v1/health') assert.equal(body.ok, true);
  console.log(`API PASS ${path}`);
}
for (const [reference, status, error] of [['invalid', 400, 'invalid_request'], ['00000000-0000-0000-0000-000000000000', 404, 'not_found']]) {
  const path = `/v1/inspect/${reference}`;
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, status, path);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/, path);
  assert.equal((await response.json()).error, error, path);
  console.log(`INSPECT PASS ${path}`);
}
const spacedJson = await fetch(`${origin}/v1/proposals`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'create', allocation: -1 }, null, 2),
  signal: AbortSignal.timeout(30_000),
});
assert.equal(spacedJson.status, 401, 'pretty-printed JSON should reach API authentication');
assert.equal((await spacedJson.json()).error, 'unauthorized');
console.log('JSON BODY PASS /v1/proposals');
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30_000);
let reader;
try {
  const response = await fetch(`${origin}/v1/stream`, { signal: controller.signal });
  assert.equal(response.status, 200, '/v1/stream');
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (!output.includes(': connected\n\n')) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false, 'stream closed before connection frame');
    output += decoder.decode(chunk.value, { stream: true });
    assert.ok(output.length < 64_000, 'unexpected stream payload');
  }
  console.log('SSE PASS /v1/stream');
} finally {
  clearTimeout(timer);
  controller.abort();
  await reader?.cancel().catch(() => {});
}
console.log('DEPLOYMENT SMOKE PASS');
