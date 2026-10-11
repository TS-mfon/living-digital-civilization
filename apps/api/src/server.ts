import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { keccak256, stringToHex } from 'viem';
import { activeApiKeyCount, claimProposalLifecycle, createAgent, createProposal, db, GENESIS_ID, getActivity, getOrganization, getOrganizations, getProposal, insertOrganization, pendingEvaluations, proposalsForOrganization, recordActivity, setOrganizationStatus, setResourceUnits, updateProposal } from './db.js';
import { adapterHealth, familyHash, finalizedEvaluation, isDemoMode, relayToBase, submitEvaluation } from './adapters.js';
import { authenticate, issueKey, revokeKey, type Agent } from './security.js';
import type { OrganizationRow, ProposalInput, ProposalRow } from './domain.js';

export const app = Fastify({ logger: process.env.NODE_ENV !== 'test', bodyLimit: 24 * 1024, requestIdHeader: 'x-request-id' });
await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'], methods: ['GET', 'POST', 'DELETE'] });
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

const nameSchema = z.string().trim().min(2).max(80);
const proposalSchema = z.object({
  action: z.enum(['create', 'evolve', 'retire']),
  parentId: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  organizationId: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  name: nameSchema.optional(),
  type: z.string().trim().min(2).max(48).optional(),
  purpose: z.string().trim().min(10).max(2000).optional(),
  constitution: z.string().trim().max(4000).optional(),
  allocation: z.number().int().min(0).max(1_000_000).default(0),
}).superRefine((value, ctx) => {
  if (value.action === 'create' && (!value.parentId || !value.name || !value.type || !value.purpose)) ctx.addIssue({ code: 'custom', message: 'Create requires parentId, name, type, and purpose' });
  if (value.action === 'evolve' && (!value.organizationId || !value.name || !value.type || !value.purpose || !value.constitution)) ctx.addIssue({ code: 'custom', message: 'Evolve requires organizationId, name, type, purpose, and constitution' });
  if (value.action === 'retire' && !value.organizationId) ctx.addIssue({ code: 'custom', message: 'Retire requires organizationId' });
});

function bearer(request: FastifyRequest): string | undefined {
  const value = request.headers.authorization;
  if (!value?.startsWith('Bearer ')) return undefined;
  return value.slice(7).trim();
}
async function requireAgent(request: FastifyRequest, reply: FastifyReply): Promise<Agent | null> {
  const agent = await authenticate(bearer(request));
  if (!agent) { void reply.code(401).send({ error: 'unauthorized', message: 'Use a valid agent API key.' }); return null; }
  return agent;
}
function serializeProposal(row: ProposalRow) {
  return { ...row, evaluation: row.evaluation ? JSON.parse(row.evaluation) : null };
}
function shortError(error: unknown) { return error instanceof Error ? error.message.slice(0, 500) : 'Unexpected lifecycle error'; }

async function completeLifecycle(proposalId: string): Promise<boolean> {
  let proposal = await getProposal(proposalId);
  if (!proposal) return true;
  if (proposal.status !== 'evaluating' && proposal.status !== 'finalizing') return true;
  try {
    const evaluation = await finalizedEvaluation(proposal);
    if (!evaluation) return false;
    if (!await claimProposalLifecycle(proposalId)) return true;
    proposal = (await getProposal(proposalId))!;
    await updateProposal(proposalId, { status: 'relaying', evaluation: JSON.stringify(evaluation), error: null });
    await recordActivity(evaluation.approved ? 'evaluation.approved' : 'evaluation.rejected', { rationale: evaluation.rationale, demo: isDemoMode() }, proposalId, proposal.organizationId);
    if (!evaluation.approved) {
      await updateProposal(proposalId, { status: 'rejected' });
      return true;
    }
    const base = await relayToBase(proposal, evaluation);
    await updateProposal(proposalId, { baseTx: base.txHash });
    const createdAt = new Date().toISOString();
    if (proposal.action === 'create' || proposal.action === 'evolve') {
      const parentId = proposal.action === 'create' ? proposal.parentId : (await getOrganization(proposal.organizationId!))?.parentId ?? null;
      const predecessor = proposal.action === 'evolve' ? await getOrganization(proposal.organizationId!) : undefined;
      const parent = parentId ? await getOrganization(parentId) : undefined;
      const id = base.id ?? keccak256(stringToHex(`${proposal.action}:${proposal.id}`));
      const familyId = base.familyId ?? predecessor?.familyId ?? familyHash(id as `0x${string}`);
      if (proposal.action === 'create' && parent) await setResourceUnits(parent.id, Math.max(0, parent.resourceUnits - proposal.allocation));
      if (proposal.action === 'evolve' && predecessor) {
        await setOrganizationStatus(predecessor.id, 'replaced');
        if (parent) await setResourceUnits(parent.id, Math.max(0, parent.resourceUnits - proposal.allocation));
      }
      const org: OrganizationRow = {
        id, familyId, parentId, previousId: predecessor?.id ?? null,
        name: proposal.name, type: proposal.type, purpose: proposal.purpose,
        constitution: evaluation.constitution, generation: base.generation ?? (proposal.action === 'create' ? (parent?.generation ?? 0) + 1 : predecessor!.generation),
        version: base.version ?? (proposal.action === 'create' ? 1 : (predecessor?.version ?? 0) + 1),
        resourceUnits: base.resourceUnits ?? (proposal.action === 'create' ? proposal.allocation : (predecessor?.resourceUnits ?? 0) + proposal.allocation),
        status: 'active', address: base.instance ?? null, createdAt,
      };
      await insertOrganization(org);
      await updateProposal(proposalId, { status: proposal.action === 'evolve' ? 'replaced' : 'active' });
      await recordActivity(proposal.action === 'evolve' ? 'organization.evolved' : 'organization.created', { organization: org, baseTx: base.txHash, demo: isDemoMode() }, proposalId, org.id);
    } else {
      const org = await getOrganization(proposal.organizationId!);
      if (org?.parentId) await setResourceUnits(org.parentId, ((await getOrganization(org.parentId))?.resourceUnits ?? 0) + org.resourceUnits);
      await setOrganizationStatus(proposal.organizationId!, 'retired', 0);
      await updateProposal(proposalId, { status: 'retired' });
      await recordActivity('organization.retired', { organizationId: proposal.organizationId, baseTx: base.txHash, demo: isDemoMode() }, proposalId, proposal.organizationId);
    }
    return true;
  } catch (error) {
    await updateProposal(proposalId, { status: 'failed', error: shortError(error) });
    await recordActivity('lifecycle.failed', { error: shortError(error) }, proposalId, proposal.organizationId);
    app.log.error({ err: error, proposalId }, 'Institution lifecycle failed');
    return true;
  }
}

function scheduleLocalLifecycle(proposalId: string, delay = 180): void {
  if (process.env.VERCEL) return;
  setTimeout(async () => {
    const complete = await completeLifecycle(proposalId);
    if (!complete) scheduleLocalLifecycle(proposalId, 5_000);
  }, delay);
}

app.get('/health', async () => ({ ok: true, service: 'living-digital-civilization-api', ...await adapterHealth() }));
app.get('/v1/internal/process', async (request, reply) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || bearer(request) !== secret) return reply.code(401).send({ error: 'unauthorized' });
  const pending = await pendingEvaluations(10);
  let completed = 0;
  for (const proposal of pending) if (await completeLifecycle(proposal.id)) completed += 1;
  return { processed: pending.length, completed, remaining: pending.length - completed };
});
app.post('/v1/agents', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
  const parsed = z.object({ name: nameSchema }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', details: parsed.error.flatten() });
  const agentId = randomUUID();
  await createAgent(agentId, parsed.data.name, new Date().toISOString());
  const key = await issueKey(agentId);
  await recordActivity('agent.registered', { agentId, name: parsed.data.name });
  return reply.code(201).send({ agent: { id: agentId, name: parsed.data.name }, keyId: key.id, apiKey: key.secret, warning: 'Copy this key now. It is shown only once.' });
});

app.get('/v1/agents/me', async (request, reply) => {
  const agent = await requireAgent(request, reply); if (!agent) return;
  const keyCount = await activeApiKeyCount(agent.id);
  return { agent, activeKeyCount: keyCount };
});
app.post('/v1/agents/keys', async (request, reply) => {
  const agent = await requireAgent(request, reply); if (!agent) return;
  const key = await issueKey(agent.id);
  return reply.code(201).send({ keyId: key.id, apiKey: key.secret, warning: 'Copy this key now. It is shown only once.' });
});
app.delete<{ Params: { keyId: string } }>('/v1/agents/keys/:keyId', async (request, reply) => {
  const agent = await requireAgent(request, reply); if (!agent) return;
  if (!await revokeKey(agent.id, request.params.keyId)) return reply.code(404).send({ error: 'not_found', message: 'Active key not found for this agent.' });
  return { revoked: true, keyId: request.params.keyId };
});

app.post('/v1/proposals', async (request, reply) => {
  const agent = await requireAgent(request, reply); if (!agent) return;
  const parsed = proposalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', details: parsed.error.flatten() });
  const input = parsed.data as ProposalInput;
  const source = input.action === 'create' ? await getOrganization(input.parentId!) : await getOrganization(input.organizationId!);
  if (!source || source.status !== 'active') return reply.code(409).send({ error: 'invalid_organization', message: 'The parent or target organization must exist and be active.' });
  if (input.action === 'evolve' && input.organizationId === GENESIS_ID) return reply.code(409).send({ error: 'immutable_genesis', message: 'The Genesis organization cannot be evolved.' });
  if (input.action === 'retire' && (await getOrganizations()).some((org) => org.parentId === source.id && org.status === 'active')) return reply.code(409).send({ error: 'active_children', message: 'Retire or evolve active child institutions before retiring their parent.' });
  if (input.action === 'create' && input.allocation! > source.resourceUnits) return reply.code(409).send({ error: 'insufficient_resources', available: source.resourceUnits });
  if (input.action === 'evolve' && input.allocation! > ((await getOrganization(source.parentId ?? ''))?.resourceUnits ?? 0) + source.resourceUnits) return reply.code(409).send({ error: 'insufficient_resources', message: 'The parent and current version do not have enough resource units.' });
  if (input.action === 'retire' && input.organizationId === GENESIS_ID) return reply.code(409).send({ error: 'immutable_genesis', message: 'The Genesis organization cannot be retired.' });
  const target = input.action === 'retire' ? source : undefined;
  const row: ProposalRow = {
    id: randomUUID(), agentId: agent.id, action: input.action,
    parentId: input.action === 'create' ? input.parentId! : target?.parentId ?? null,
    organizationId: input.action === 'create' ? null : input.organizationId!,
    name: input.name ?? target?.name ?? '', type: input.type ?? target?.type ?? '',
    purpose: input.purpose ?? target?.purpose ?? '', constitution: input.constitution ?? target?.constitution ?? '',
    allocation: input.allocation ?? 0, status: 'submitted', evaluation: null, genlayerTx: null, baseTx: null, error: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await createProposal(row);
  await recordActivity('proposal.submitted', { action: row.action, agentId: agent.id }, row.id, row.organizationId);
  try {
    const txHash = await submitEvaluation(row);
    await updateProposal(row.id, { status: 'evaluating', genlayerTx: txHash });
    await recordActivity('evaluation.submitted', { txHash, demo: isDemoMode() }, row.id, row.organizationId);
    scheduleLocalLifecycle(row.id, isDemoMode() ? 180 : 0);
  } catch (error) {
    await updateProposal(row.id, { status: 'failed', error: shortError(error) });
    return reply.code(503).send({ proposalId: row.id, status: 'failed', error: shortError(error) });
  }
  return reply.code(202).send({ proposalId: row.id, status: 'evaluating', genlayerTx: (await getProposal(row.id))?.genlayerTx, demo: isDemoMode() });
});

app.get<{ Params: { id: string } }>('/v1/proposals/:id', async (request, reply) => {
  const agent = await requireAgent(request, reply); if (!agent) return;
  let proposal = await getProposal(request.params.id);
  if (!proposal || proposal.agentId !== agent.id) return reply.code(404).send({ error: 'not_found' });
  const leaseExpired = proposal.status === 'finalizing' && Date.now() - Date.parse(proposal.updatedAt) > 120_000;
  if (proposal.status === 'evaluating' || leaseExpired) {
    await completeLifecycle(proposal.id);
    proposal = await getProposal(request.params.id);
  }
  if (!proposal) return reply.code(404).send({ error: 'not_found' });
  return serializeProposal(proposal);
});
app.get('/v1/organizations', async () => ({ organizations: await getOrganizations(), demo: isDemoMode() }));
app.get<{ Params: { id: string } }>('/v1/organizations/:id', async (request, reply) => {
  const org = await getOrganization(request.params.id);
  if (!org) return reply.code(404).send({ error: 'not_found' });
  const children = (await getOrganizations()).filter((item) => item.parentId === org.id);
  const latestProposal = await proposalsForOrganization(org.id);
  return { organization: org, children, recentProposals: latestProposal.map((item) => ({ ...item, evaluation: item.evaluation ? JSON.parse(item.evaluation as string) : null })), demo: isDemoMode() };
});
app.get<{ Params: { id: string } }>('/v1/lineage/:id', async (request, reply) => {
  const focus = await getOrganization(request.params.id);
  if (!focus) return reply.code(404).send({ error: 'not_found' });
  const all = await getOrganizations();
  const ancestors: OrganizationRow[] = [];
  let parentId = focus.parentId;
  while (parentId) { const parent = all.find((item) => item.id === parentId); if (!parent) break; ancestors.unshift(parent); parentId = parent.parentId; }
  const family = all.filter((item) => item.familyId === focus.familyId).sort((a, b) => a.version - b.version);
  const children = all.filter((item) => item.parentId === focus.id);
  return { focus, ancestors, familyVersions: family, children, demo: isDemoMode() };
});
app.get('/v1/activity', async () => ({ events: await getActivity(60), demo: isDemoMode() }));

export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  await app.listen({ host: '0.0.0.0', port });
  app.log.info({ port, demo: isDemoMode(), genesisId: GENESIS_ID }, 'Living Digital Civilization API ready');
}

process.on('SIGINT', () => { db.close(); void app.close().then(() => process.exit(0)); });
