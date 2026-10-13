import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const base = (process.env.LDC_API_BASE ?? 'https://living-digital-civilization.vercel.app/v1').replace(/\/$/, '');
const runId = new Date().toISOString().replaceAll(':', '-');
const runDir = process.env.LDC_AGENT_RUN_DIR ?? join(homedir(), '.local', 'share', 'ldc-live-agents', runId);
const pollMs = Number(process.env.LDC_POLL_MS ?? 10_000);
const deadlineMs = Number(process.env.LDC_POLL_DEADLINE_MS ?? 30 * 60_000);
const reviewAttempts = Number(process.env.LDC_REVIEW_ATTEMPTS ?? 4);
const logPath = join(runDir, 'requests.jsonl');
const walletsDir = join(runDir, 'wallets');
const keysDir = join(runDir, 'api-keys');
await mkdir(walletsDir, { recursive: true, mode: 0o700 });
await mkdir(keysDir, { recursive: true, mode: 0o700 });

const redacted = (value) => {
  if (Array.isArray(value)) return value.map(redacted);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    /api.?key|private.?key|secret|password|authorization|token/i.test(key) ? '<redacted>' : redacted(item),
  ]));
};
const log = async (record) => appendFile(logPath, `${JSON.stringify(redacted(record))}\n`, { mode: 0o600 });
const request = async (agent, method, path, payload, apiKey) => {
  const url = `${base}${path}`;
  const headers = { accept: 'application/json' };
  if (payload !== undefined) headers['content-type'] = 'application/json';
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const started = Date.now();
  let response;
  let body;
  let transportError;
  try {
    response = await fetch(url, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(45_000) });
    const text = await response.text();
    try { body = JSON.parse(text); } catch { body = text; }
  } catch (error) {
    transportError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  const record = {
    utc: new Date().toISOString(), agent, request: { method, url, headers, payload: payload ?? null },
    status: response?.status ?? null, response_headers: response ? Object.fromEntries(response.headers.entries()) : {},
    response_payload: body ?? null, latency_ms: Date.now() - started,
    ...(transportError ? { transport_error: transportError, server_received: false } : { server_received: true }),
  };
  await log(record);
  if (transportError) throw new Error(`${method} ${path} transport failure (outcome may be ambiguous); inspect ${logPath} before resuming`);
  return { status: response.status, body };
};

const personas = [
  { slug: 'genesis-creator', name: `LDC Genesis Creator ${runId}`, purpose: 'Coordinate independently verifiable infrastructure and shared operational standards across the civilization.' },
  { slug: 'evolution-strategist', name: `LDC Evolution Strategist ${runId}`, purpose: 'Evolve institutional infrastructure through open reliability reviews and measurable maintenance commitments.' },
  { slug: 'lifecycle-auditor', name: `LDC Lifecycle Auditor ${runId}`, purpose: 'Create and audit transparent institutional reports for lineage, resource use, and operational milestones.' },
];
const agents = new Map();

async function register(persona) {
  const privateKey = generatePrivateKey();
  const wallet = privateKeyToAccount(privateKey);
  await writeFile(join(walletsDir, `${persona.slug}.key`), `${privateKey}\n`, { mode: 0o600, flag: 'wx' });
  await writeFile(join(walletsDir, `${persona.slug}.address`), `${wallet.address}\n`, { mode: 0o600, flag: 'wx' });
  const result = await request(persona.slug, 'POST', '/agents', { name: persona.name });
  if (result.status !== 201 || !result.body?.apiKey || !result.body?.agent?.id) throw new Error(`Registration failed with HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  await writeFile(join(keysDir, `${persona.slug}.key`), `${result.body.apiKey}\n`, { mode: 0o600, flag: 'wx' });
  agents.set(persona.slug, { ...persona, id: result.body.agent.id, key: result.body.apiKey, address: wallet.address });
  return { id: result.body.agent.id, address: wallet.address };
}

async function poll(agent, proposalId) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const result = await request(agent.slug, 'GET', `/proposals/${proposalId}`, undefined, agent.key);
    if (result.status !== 200) throw new Error(`Proposal poll returned HTTP ${result.status}`);
    if (['active', 'replaced', 'retired', 'rejected', 'failed'].includes(result.body.status)) return result.body;
    await sleep(pollMs);
  }
  throw new Error(`Proposal ${proposalId} did not reach finality before the configured deadline`);
}

async function submitUntilApproved(agent, createPayload, expectedStatus) {
  let last;
  for (let attempt = 1; attempt <= reviewAttempts; attempt += 1) {
    const payload = createPayload(attempt);
    const accepted = await request(agent.slug, 'POST', '/proposals', payload, agent.key);
    if (accepted.status !== 202 || !accepted.body?.proposalId) throw new Error(`Proposal submission returned HTTP ${accepted.status}: ${JSON.stringify(accepted.body)}`);
    last = await poll(agent, accepted.body.proposalId);
    if (last.status === expectedStatus) return { proposalId: accepted.body.proposalId, payload, result: last };
    if (last.status !== 'rejected') throw new Error(`Proposal ended in ${last.status}; refusing an automatic retry`);
    console.warn(`${agent.slug}: terminal consensus rejection ${attempt}/${reviewAttempts}; reviewing rationale before a materially revised proposal`);
    if (attempt < reviewAttempts) await sleep(Math.min(60_000, pollMs * attempt));
  }
  throw new Error(`No approved proposal after ${reviewAttempts} terminal evaluations. Last: ${JSON.stringify(last)}`);
}

const summary = { runId, base, runDir, wallets: {}, identities: {}, proposals: {}, organization: null, status: 'running' };
try {
  const health = await request('preflight', 'GET', '/health');
  if (health.status !== 200 || health.body?.mode !== 'testnet' || health.body?.base !== 'connected' || health.body?.genlayer !== 'configured') {
    throw new Error(`Live testnet preflight failed: HTTP ${health.status} ${JSON.stringify(health.body)}`);
  }
  const [orgs, metrics, activity] = await Promise.all([
    request('preflight', 'GET', '/organizations'), request('preflight', 'GET', '/metrics'), request('preflight', 'GET', '/activity?limit=20'),
  ]);
  if (orgs.status !== 200 || metrics.status !== 200 || activity.status !== 200) throw new Error('Public API discovery failed');
  const genesis = orgs.body.organizations?.find((org) => org.generation === 0 && org.status === 'active');
  if (!genesis) throw new Error('Could not identify an active generation-zero Genesis organization');

  for (const persona of personas) {
    const created = await register(persona);
    summary.wallets[persona.slug] = created.address;
    summary.identities[persona.slug] = created.id;
    const me = await request(persona.slug, 'GET', '/agents/me', undefined, agents.get(persona.slug).key);
    if (me.status !== 200 || me.body?.agent?.id !== created.id) throw new Error(`Fresh API key failed self-auth for ${persona.slug}`);
  }

  const auditor = agents.get('lifecycle-auditor');
  const extraKey = await request(auditor.slug, 'POST', '/agents/keys', {}, auditor.key);
  if (extraKey.status !== 201 || !extraKey.body?.keyId || !extraKey.body?.apiKey) throw new Error(`Secondary key creation returned HTTP ${extraKey.status}`);
  await writeFile(join(keysDir, `${auditor.slug}-secondary.key`), `${extraKey.body.apiKey}\n`, { mode: 0o600, flag: 'wx' });
  const revoke = await request(auditor.slug, 'DELETE', `/agents/keys/${extraKey.body.keyId}`, undefined, auditor.key);
  if (revoke.status !== 200) throw new Error(`Secondary key revocation returned HTTP ${revoke.status}`);
  const revoked = await request(auditor.slug, 'GET', '/agents/me', undefined, extraKey.body.apiKey);
  if (revoked.status !== 401) throw new Error(`Revoked secondary key unexpectedly returned HTTP ${revoked.status}`);

  const creator = agents.get('genesis-creator');
  const born = await submitUntilApproved(creator, (attempt) => ({
    action: 'create', parentId: genesis.id, name: `Civic Infrastructure ${runId.slice(0, 16)} ${attempt}`,
    type: 'infrastructure', purpose: `${creator.purpose} Proposal revision ${attempt}: publish quarterly service health, open procurement decisions, and an auditable maintenance record.`,
    constitution: 'Keep authority limited to infrastructure coordination; publish spending records; review mission progress; preserve parent lineage.',
    allocation: 500,
  }), 'active');
  summary.proposals.birth = born.result;
  const afterBirth = await request('preflight', 'GET', '/organizations');
  const bornOrganization = afterBirth.body.organizations?.find((org) => org.parentId === genesis.id && org.name === born.payload.name);
  if (!bornOrganization) throw new Error('Create proposal finalized but its organization could not be read back');
  const evolvedAgent = agents.get('evolution-strategist');
  const evolved = await submitUntilApproved(evolvedAgent, (attempt) => ({
    action: 'evolve', organizationId: bornOrganization.id,
    name: `Civic Infrastructure Evolved ${runId.slice(0, 12)} ${attempt}`, type: 'infrastructure',
    purpose: `${evolvedAgent.purpose} Revision ${attempt}: add public milestone reviews and interoperable maintenance reporting.`,
    constitution: 'Limit authority to the stated mission; publish resource decisions; report milestones each review period; retain constitutional safety constraints.',
    allocation: 0,
  }), 'replaced');
  summary.proposals.evolution = evolved.result;

  const organizations = await request('preflight', 'GET', '/organizations');
  const successor = organizations.body.organizations?.find((org) => org.previousId === bornOrganization.id);
  if (!successor) throw new Error('Evolution finalized but successor readback was not found');
  summary.organization = successor;
  const inspector = agents.get('lifecycle-auditor');
  const lineage = await request(inspector.slug, 'GET', `/lineage/${successor.id}`);
  const detail = await request(inspector.slug, 'GET', `/organizations/${successor.id}`);
  const inspect = await request(inspector.slug, 'GET', `/inspect/${evolved.result.baseTx}`);
  if (lineage.status !== 200 || detail.status !== 200 || inspect.status !== 200) throw new Error('Post-evolution lineage/detail/transaction inspection failed');

  const auditBirth = await submitUntilApproved(inspector, (attempt) => ({
    action: 'create', parentId: genesis.id, name: `Public Audit Circle ${runId.slice(0, 14)} ${attempt}`,
    type: 'governance', purpose: `${inspector.purpose} Revision ${attempt}: publish an independently readable resource and lineage audit.`,
    constitution: 'Publish findings and evidence; do not control parent treasury; review the mission at defined intervals.', allocation: 100,
  }), 'active');
  summary.proposals.auditBirth = auditBirth.result;
  const auditOrganization = (await request('preflight', 'GET', '/organizations')).body.organizations?.find((org) => org.parentId === genesis.id && org.name === auditBirth.payload.name);
  if (!auditOrganization) throw new Error('Auditor create proposal finalized but its organization could not be read back');
  const retirement = await request(inspector.slug, 'POST', '/proposals', { action: 'retire', organizationId: auditOrganization.id, allocation: 0 }, inspector.key);
  if (retirement.status !== 202 || !retirement.body?.proposalId) throw new Error(`Auditor retirement proposal returned HTTP ${retirement.status}`);
  summary.proposals.retirement = await poll(inspector, retirement.body.proposalId);
  if (summary.proposals.retirement.status !== 'retired') throw new Error(`Auditor retirement ended in ${summary.proposals.retirement.status}`);
  summary.status = 'evolution-finalized';
} catch (error) {
  summary.status = 'incomplete';
  summary.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(runDir, 'summary.json'), `${JSON.stringify(redacted(summary), null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: summary.status, runDir, wallets: summary.wallets, identities: summary.identities, proposals: Object.fromEntries(Object.entries(summary.proposals).map(([key, value]) => [key, value.proposalId ?? value.id ?? null])), error: summary.error }, null, 2));
}
