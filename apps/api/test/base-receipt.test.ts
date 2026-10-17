import assert from 'node:assert/strict';
import { test } from 'node:test';
import { concatHex, createPublicClient, custom, decodeFunctionData, encodeAbiParameters, encodeEventTopics, encodeFunctionResult, keccak256, parseAbiParameters, stringToHex, toHex, zeroAddress, zeroHash, type Address, type Hex, type TransactionReceipt } from 'viem';
import { baseSepolia } from 'viem/chains';
import { generatePrivateKey } from 'viem/accounts';
import { baseResultFromReceipt, registryAbi } from '../src/protocol/baseReceipt.js';
import type { ProposalRow } from '../src/domain.js';

const registry: Address = '0x1111111111111111111111111111111111111111';
const instance: Address = '0x2222222222222222222222222222222222222222';
const parentId = keccak256(stringToHex('LDC_GENESIS'));
const proposal = { id: 'create-receipt-fixture', action: 'create' as const, parentId, organizationId: null, allocation: 500 };
const proposalHash = keccak256(stringToHex(proposal.id));
const childId = keccak256(encodeAbiParameters(parseAbiParameters('string, bytes32'), ['CREATE', proposalHash]));
const family = (id: Hex) => keccak256(concatHex([stringToHex('FAMILY'), id]));
const constitution = keccak256(stringToHex('Bounded authority and transparent accounting.'));
const hash = keccak256(stringToHex('Base transaction'));
const blockHash = keccak256(stringToHex('Base block'));
type RegistryRecord = { id: Hex; familyId: Hex; parentId: Hex; previousVersionId: Hex; instance: Address; generation: number; version: number; resourceUnits: bigint; status: number };
const parent: RegistryRecord = { id: parentId, familyId: family(parentId), parentId: zeroHash, previousVersionId: zeroHash, instance: registry, generation: 0, version: 1, resourceUnits: 999500n, status: 0 };
const child: RegistryRecord = { id: childId, familyId: family(childId), parentId, previousVersionId: zeroHash, instance, generation: 1, version: 1, resourceUnits: 500n, status: 0 };
const absent: RegistryRecord = { id: zeroHash, familyId: zeroHash, parentId: zeroHash, previousVersionId: zeroHash, instance: zeroAddress, generation: 0, version: 0, resourceUnits: 0n, status: 0 };
const commonLog = { address: registry, blockHash, blockNumber: 100n, transactionHash: hash, transactionIndex: 0, logIndex: 0, removed: false };
const createdLog = {
  ...commonLog,
  topics: encodeEventTopics({ abi: registryAbi, eventName: 'OrganizationCreated', args: { proposalId: proposalHash, organizationId: childId, parentId } }) as [Hex, ...Hex[]],
  data: encodeAbiParameters(parseAbiParameters('address, bytes32, uint256'), [instance, constitution, 500n]),
};
const receipt = { status: 'success' as const, to: registry, transactionHash: hash, blockNumber: 100n, logs: [createdLog] } as unknown as TransactionReceipt;

function reader(records: Map<Hex, RegistryRecord>, blocks: string[] = []) {
  return createPublicClient({ chain: baseSepolia, transport: custom({ request: async ({ method, params }) => {
    assert.equal(method, 'eth_call');
    const [call, block] = params as [{ to: string; data: Hex }, string];
    assert.equal(call.to.toLowerCase(), registry);
    blocks.push(block);
    const decoded = decodeFunctionData({ abi: registryAbi, data: call.data });
    assert.equal(decoded.functionName, 'getOrganization');
    // Model a provider whose "latest" node has not seen the receipt yet.
    const record = block === '0x64' ? records.get(decoded.args[0] as Hex) ?? absent : absent;
    return encodeFunctionResult({ abi: registryAbi, functionName: 'getOrganization', result: record });
  } }) });
}

test('Base creation reads its receipt block when latest state would return an empty organization', async () => {
  const blocks: string[] = [];
  const result = await baseResultFromReceipt(reader(new Map([[parentId, parent], [childId, child]]), blocks), registry, proposal, constitution, receipt);
  assert.equal(result.id, childId);
  assert.equal(result.familyId, family(childId));
  assert.equal(result.generation, 1);
  assert.equal(result.version, 1);
  assert.equal(result.resourceUnits, 500);
  assert.equal(result.parentResourceUnits, 999500);
  assert.deepEqual(blocks, ['0x64', '0x64']);
});

test('an empty or unrelated registry mapping never becomes a completed organization', async () => {
  for (const record of [absent, { ...child, id: parentId }, { ...child, familyId: zeroHash }, { ...child, version: 0 }]) {
    await assert.rejects(baseResultFromReceipt(reader(new Map([[parentId, parent], [childId, record]])), registry, proposal, constitution, receipt), /missing or invalid/);
  }
});

test('Base outcomes require a successful receipt and the expected registry, proposal and constitution', async () => {
  const client = reader(new Map([[parentId, parent], [childId, child]]));
  await assert.rejects(baseResultFromReceipt(client, registry, proposal, constitution, { ...receipt, status: 'reverted' }), /reverted/);
  await assert.rejects(baseResultFromReceipt(client, registry, proposal, constitution, { ...receipt, to: instance }), /different registry/);
  await assert.rejects(baseResultFromReceipt(client, registry, proposal, constitution, { ...receipt, logs: [{ ...createdLog, address: instance }] }), /one registry lifecycle event/);
  await assert.rejects(baseResultFromReceipt(client, registry, { ...proposal, id: 'unrelated' }, constitution, receipt), /different proposal/);
  await assert.rejects(baseResultFromReceipt(client, registry, proposal, zeroHash, receipt), /constitution/);
});

test('Base evolution verifies predecessor lineage and reads the additional allocation from confirmed state', async () => {
  const evolution = { ...proposal, id: 'evolve-receipt-fixture', action: 'evolve' as const, organizationId: childId, allocation: 200 };
  const evolutionHash = keccak256(stringToHex(evolution.id));
  const successorId = keccak256(encodeAbiParameters(parseAbiParameters('string, bytes32'), ['EVOLVE', evolutionHash]));
  const successor = { ...child, id: successorId, previousVersionId: childId, version: 2, resourceUnits: 700n };
  const log = {
    ...commonLog,
    topics: encodeEventTopics({ abi: registryAbi, eventName: 'OrganizationEvolved', args: { proposalId: evolutionHash, previousId: childId, organizationId: successorId } }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(parseAbiParameters('address, bytes32, uint32'), [instance, constitution, 2]),
  };
  const records = new Map([[parentId, { ...parent, resourceUnits: 999300n }], [childId, { ...child, status: 1 }], [successorId, successor]]);
  const result = await baseResultFromReceipt(reader(records), registry, evolution, constitution, { ...receipt, logs: [log] });
  assert.equal(result.familyId, child.familyId);
  assert.equal(result.version, 2);
  assert.equal(result.generation, 1);
  assert.equal(result.resourceUnits, 700);
  assert.equal(result.parentResourceUnits, 999300);
  records.set(successorId, { ...successor, resourceUnits: 200n });
  await assert.rejects(baseResultFromReceipt(reader(records), registry, evolution, constitution, { ...receipt, logs: [log] }), /allocation is inconsistent/);
});

test('Base retirement verifies retired state and authoritative resource return to the parent', async () => {
  const retirement = { ...proposal, id: 'retire-receipt-fixture', action: 'retire' as const, organizationId: childId, allocation: 0 };
  const log = {
    ...commonLog,
    topics: encodeEventTopics({ abi: registryAbi, eventName: 'OrganizationRetired', args: { proposalId: keccak256(stringToHex(retirement.id)), organizationId: childId } }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(parseAbiParameters('uint256'), [500n]),
  };
  const records = new Map([[parentId, { ...parent, resourceUnits: 1000000n }], [childId, { ...child, resourceUnits: 0n, status: 2 }]]);
  const result = await baseResultFromReceipt(reader(records), registry, retirement, constitution, { ...receipt, logs: [log] });
  assert.equal(result.resourceUnits, 0);
  assert.equal(result.parentResourceUnits, 1000000);
  records.set(childId, child);
  await assert.rejects(baseResultFromReceipt(reader(records), registry, retirement, constitution, { ...receipt, logs: [log] }), /retirement is not reflected/);
});

test('retrying a stored Base hash never rebroadcasts and preserves the hash when readback fails', { timeout: 10000 }, async (context) => {
  process.env.DEMO_MODE = 'false';
  process.env.BASE_RPC_URL = 'https://base-receipt-test.invalid';
  process.env.BASE_REGISTRY_ADDRESS = registry;
  process.env.BASE_RELAYER_PRIVATE_KEY = generatePrivateKey();
  const { relayToBase } = await import('../src/adapters.js');
  const methods: string[] = [];
  let savedHash: string | undefined;
  context.mock.method(globalThis, 'fetch', async (_input: unknown, init: RequestInit) => {
    const request = JSON.parse(init.body as string);
    methods.push(request.method);
    assert.equal(savedHash, hash, 'the Base hash must be persisted before any receipt/state read');
    let result: unknown;
    if (request.method === 'eth_blockNumber') result = '0x64';
    else if (request.method === 'eth_getTransactionReceipt') result = {
      ...receipt, blockHash, blockNumber: '0x64', from: instance, status: '0x1', type: '0x2', transactionIndex: '0x0',
      cumulativeGasUsed: '0x1', gasUsed: '0x1', effectiveGasPrice: '0x1', contractAddress: null, logsBloom: '0x' + '00'.repeat(256),
      logs: receipt.logs.map((log) => ({ ...log, blockNumber: toHex(log.blockNumber), transactionIndex: '0x0', logIndex: '0x0' })),
    };
    else if (request.method === 'eth_call') result = encodeFunctionResult({ abi: registryAbi, functionName: 'getOrganization', result: absent });
    else assert.fail('Unexpected RPC method (must not broadcast): ' + request.method);
    return Response.json({ jsonrpc: '2.0', id: request.id, result });
  });
  const row: ProposalRow = { ...proposal, agentId: 'fixture-agent', name: 'Fixture', type: 'test', purpose: 'Exercise receipt recovery', constitution: 'Bounded authority and transparent accounting.', status: 'relaying', evaluation: null, genlayerTx: hash, baseTx: hash, error: null, createdAt: '2026-10-16T00:00:00Z', updatedAt: '2026-10-16T00:00:00Z' };
  await assert.rejects(relayToBase(row, { constitution: row.constitution }, async (submitted) => { savedHash = submitted; }), /missing or invalid/);
  assert.equal(savedHash, hash);
  assert.ok(methods.includes('eth_call'));
  assert.ok(methods.every((method) => ['eth_blockNumber', 'eth_getTransactionReceipt', 'eth_call'].includes(method)));
});
