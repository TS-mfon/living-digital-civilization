import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDir = mkdtempSync(join(tmpdir(), 'ldc-api-'));
process.env.DATABASE_PATH = join(testDir, 'api.sqlite');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.CRON_SECRET = 'test-cron-secret-for-local-suite';
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;

const { app } = await import('../src/server.js');
const { db, GENESIS_ID } = await import('../src/db.js');
process.env.VERCEL = '1';

before(async () => { await app.ready(); });
after(async () => { await app.close(); db.close(); rmSync(testDir, { recursive: true, force: true }); });

test('agent can receive a one-time key, submit a child DAO, and inspect its completed lineage', async () => {
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().mode, 'demo');
  const versionedHealth = await app.inject({ method: 'GET', url: '/v1/health' });
  assert.equal(versionedHealth.statusCode, 200);
  assert.equal(versionedHealth.json().mode, 'demo');

  const registration = await app.inject({ method: 'POST', url: '/v1/agents', payload: { name: 'Research Agent' } });
  assert.equal(registration.statusCode, 201);
  const issued = registration.json();
  assert.match(issued.apiKey, /^ldc_/);
  assert.equal(issued.warning, 'Copy this key now. It is shown only once.');

  const me = await app.inject({ method: 'GET', url: '/v1/agents/me', headers: { authorization: `Bearer ${issued.apiKey}` } });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().agent.name, 'Research Agent');
  assert.equal(JSON.stringify(me.json()).includes(issued.apiKey), false);

  const proposal = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'create', parentId: GENESIS_ID, name: 'Open Research', type: 'research', purpose: 'Coordinate open, reproducible research', constitution: 'Publish methods, findings, and conflicts.', allocation: 1400 },
  });
  assert.equal(proposal.statusCode, 202);
  const proposalId = proposal.json().proposalId as string;

  const waitForStatus = async (id: string, status: string) => {
    let result = await app.inject({ method: 'GET', url: `/v1/proposals/${id}`, headers: { authorization: `Bearer ${issued.apiKey}` } });
    for (let attempt = 0; attempt < 30 && result.json().status !== status; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      result = await app.inject({ method: 'GET', url: `/v1/proposals/${id}`, headers: { authorization: `Bearer ${issued.apiKey}` } });
    }
    assert.equal(result.json().status, status);
    return result.json();
  };
  let result = await waitForStatus(proposalId, 'active');
  const inspected = await app.inject({ method: 'GET', url: `/v1/inspect/${proposalId}` });
  assert.equal(inspected.statusCode, 200, inspected.body);
  assert.equal(inspected.json().id, proposalId);
  assert.equal(inspected.json().kind, 'proposal');
  const inspectedTransaction = await app.inject({ method: 'GET', url: `/v1/inspect/${encodeURIComponent(String(result.genlayerTx))}` });
  assert.equal(inspectedTransaction.statusCode, 200, inspectedTransaction.body);
  assert.equal(inspectedTransaction.json().id, proposalId);
  const institutions = await app.inject({ method: 'GET', url: '/v1/organizations' });
  const child = institutions.json().organizations.find((organization: { name: string }) => organization.name === 'Open Research');
  assert.ok(child);
  assert.equal(child.parentId, GENESIS_ID);
  assert.equal(child.resourceUnits, 1400);
  assert.ok(institutions.json().organizations.find((organization: { id: string }) => organization.id === GENESIS_ID));

  const nested = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'create', parentId: child.id, name: 'Research Lab', type: 'lab', purpose: 'Run reproducible experiments', constitution: 'Publish data and methods.', allocation: 0 },
  });
  assert.equal(nested.statusCode, 202);
  await waitForStatus(nested.json().proposalId, 'active');

  const blockedRetirement = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'retire', organizationId: child.id, allocation: 0 },
  });
  assert.equal(blockedRetirement.statusCode, 409);
  assert.equal(blockedRetirement.json().error, 'active_children');

  const activity = await app.inject({ method: 'GET', url: '/v1/activity' });
  assert.ok(activity.json().events.some((event: { event: string }) => event.event === 'organization.created'));

  const immutableGenesis = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'evolve', organizationId: GENESIS_ID, name: 'Mutable Genesis', type: 'civilization', purpose: 'Attempt to replace the constitutional root', constitution: 'Remove constitutional guarantees.', allocation: 0 },
  });
  assert.equal(immutableGenesis.statusCode, 409);

  const beforeOverdraft = (await app.inject({ method: 'GET', url: '/v1/metrics' })).json();
  const overdraft = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    // Genesis has 998600 units. The predecessor's 1400 units transfer to its
    // successor and cannot also fund this additional allocation.
    payload: { action: 'evolve', organizationId: child.id, name: 'Overdrawn Research', type: 'research', purpose: 'Coordinate open research and reproducibility', constitution: 'Publish methods, findings, and conflicts.', allocation: 999000 },
  });
  assert.equal(overdraft.statusCode, 409, overdraft.body);
  assert.equal(overdraft.json().error, 'insufficient_resources');
  assert.deepEqual((await app.inject({ method: 'GET', url: '/v1/metrics' })).json(), beforeOverdraft);

  const evolve = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'evolve', organizationId: child.id, name: 'Open Research v2', type: 'research', purpose: 'Coordinate open research and reproducibility', constitution: 'Publish methods, findings, and conflicts.', allocation: 200 },
  });
  assert.equal(evolve.statusCode, 202);
  result = await waitForStatus(evolve.json().proposalId, 'replaced');
  const afterEvolution = await app.inject({ method: 'GET', url: '/v1/organizations' });
  const successor = afterEvolution.json().organizations.find((organization: { name: string }) => organization.name === 'Open Research v2');
  assert.ok(successor);
  assert.equal(successor.previousId, child.id);
  assert.equal(successor.version, 2);
  assert.equal(successor.resourceUnits, 1600);
  assert.equal(afterEvolution.json().organizations.find((organization: { id: string }) => organization.id === child.id).status, 'replaced');
  assert.equal(afterEvolution.json().organizations.find((organization: { id: string }) => organization.id === GENESIS_ID).resourceUnits, 998400);

  const retire = await app.inject({
    method: 'POST', url: '/v1/proposals', headers: { authorization: `Bearer ${issued.apiKey}` },
    payload: { action: 'retire', organizationId: successor.id, allocation: 0 },
  });
  assert.equal(retire.statusCode, 202);
  await waitForStatus(retire.json().proposalId, 'retired');
  const afterRetirement = await app.inject({ method: 'GET', url: '/v1/organizations' });
  assert.equal(afterRetirement.json().organizations.find((organization: { id: string }) => organization.id === successor.id).status, 'retired');
  assert.equal(afterRetirement.json().organizations.find((organization: { id: string }) => organization.id === GENESIS_ID).resourceUnits, 1_000_000);

  const reopened = new Database(join(testDir, 'api.sqlite'), { readonly: true });
  assert.equal((reopened.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number }).count, 1);
  assert.equal((reopened.prepare('SELECT COUNT(*) as count FROM proposals').get() as { count: number }).count, 4);
  reopened.close();
});

test('invalid requests, unauthenticated writes, cross-agent reads, and revoked keys are rejected', async () => {
  const denied = await app.inject({ method: 'POST', url: '/v1/agents/keys' });
  assert.equal(denied.statusCode, 401);
  const badAgent = await app.inject({ method: 'POST', url: '/v1/agents', payload: { name: 'x' } });
  assert.equal(badAgent.statusCode, 400);

  const first = (await app.inject({ method: 'POST', url: '/v1/agents', payload: { name: 'Agent One' } })).json();
  const second = (await app.inject({ method: 'POST', url: '/v1/agents', payload: { name: 'Agent Two' } })).json();
  const ownKey = await app.inject({ method: 'POST', url: '/v1/agents/keys', headers: { authorization: `Bearer ${first.apiKey}` } });
  assert.equal(ownKey.statusCode, 201);
  const revoke = await app.inject({ method: 'DELETE', url: `/v1/agents/keys/${ownKey.json().keyId}`, headers: { authorization: `Bearer ${second.apiKey}` } });
  assert.equal(revoke.statusCode, 404);
  const successfulRevoke = await app.inject({ method: 'DELETE', url: `/v1/agents/keys/${ownKey.json().keyId}`, headers: { authorization: `Bearer ${first.apiKey}` } });
  assert.equal(successfulRevoke.statusCode, 200);
  const revokedRead = await app.inject({ method: 'GET', url: '/v1/agents/me', headers: { authorization: `Bearer ${ownKey.json().apiKey}` } });
  assert.equal(revokedRead.statusCode, 401);
});

test('read APIs expose public identities and metrics and reject invalid pagination', async () => {
  const negativeLimit = await app.inject({ method: 'GET', url: '/v1/activity?limit=-1' });
  assert.equal(negativeLimit.statusCode, 400);
  const oversizedLimit = await app.inject({ method: 'GET', url: '/v1/agents?limit=101' });
  assert.equal(oversizedLimit.statusCode, 400);
  const agents = await app.inject({ method: 'GET', url: '/v1/agents?limit=10' });
  assert.equal(agents.statusCode, 200);
  assert.ok(Array.isArray(agents.json().agents));
  assert.equal(JSON.stringify(agents.json()).includes('apiKey'), false);
  const metrics = await app.inject({ method: 'GET', url: '/v1/metrics' });
  assert.equal(metrics.statusCode, 200);
  assert.equal(typeof metrics.json().totalAgents, 'number');
  assert.equal(metrics.json().epoch, null);
  const invalidReference = await app.inject({ method: 'GET', url: '/v1/inspect/invalid' });
  assert.equal(invalidReference.statusCode, 400);
});

test('serverless lifecycle worker requires its private cron secret', async () => {
  const denied = await app.inject({ method: 'GET', url: '/v1/internal/process' });
  assert.equal(denied.statusCode, 401);
  const authorized = await app.inject({ method: 'GET', url: '/v1/internal/process', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  assert.equal(authorized.statusCode, 200, authorized.body);
  assert.equal(authorized.json().processed, 0);
});
