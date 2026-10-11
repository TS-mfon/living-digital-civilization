import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  decodeFunctionResult, encodeAbiParameters, encodeFunctionData, keccak256,
  parseEventLogs, stringToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const root = resolve(import.meta.dirname, '../../../');
const tmp = '/tmp/ldc-base-smoke';
const registry = (process.env.BASE_REGISTRY_ADDRESS ?? '').toLowerCase();
const proposalId = (label) => keccak256(stringToHex(label));
const idFromProposal = (action, hash) => keccak256(encodeAbiParameters([{ type: 'string' }, { type: 'bytes32' }], [action.toUpperCase(), hash]));
const jsonSafe = (value) => typeof value === 'bigint' ? value.toString() : Array.isArray(value) ? value.map(jsonSafe) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)])) : value;
const abi = [
  { type: 'function', name: 'createOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'parentId', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'organizationType', type: 'string' }, { name: 'purpose', type: 'string' }, { name: 'constitutionHash', type: 'bytes32' }, { name: 'allocation', type: 'uint256' }], outputs: [{ name: 'id', type: 'bytes32' }, { name: 'instance', type: 'address' }] },
  { type: 'function', name: 'evolveOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'previousId', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'organizationType', type: 'string' }, { name: 'purpose', type: 'string' }, { name: 'constitutionHash', type: 'bytes32' }, { name: 'additionalAllocation', type: 'uint256' }], outputs: [{ name: 'id', type: 'bytes32' }, { name: 'instance', type: 'address' }] },
  { type: 'function', name: 'retireOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'organizationId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getOrganization', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'familyId', type: 'bytes32' }, { name: 'parentId', type: 'bytes32' }, { name: 'previousVersionId', type: 'bytes32' }, { name: 'instance', type: 'address' }, { name: 'generation', type: 'uint32' }, { name: 'version', type: 'uint32' }, { name: 'resourceUnits', type: 'uint256' }, { name: 'status', type: 'uint8' }] }] },
  { type: 'function', name: 'organizationCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'event', name: 'OrganizationCreated', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: true, name: 'parentId', type: 'bytes32' }, { indexed: false, name: 'instance', type: 'address' }, { indexed: false, name: 'constitutionHash', type: 'bytes32' }, { indexed: false, name: 'resourceUnits', type: 'uint256' }] },
  { type: 'event', name: 'OrganizationEvolved', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'previousId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: false, name: 'instance', type: 'address' }, { indexed: false, name: 'constitutionHash', type: 'bytes32' }, { indexed: false, name: 'version', type: 'uint32' }] },
  { type: 'event', name: 'OrganizationRetired', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: false, name: 'returnedResourceUnits', type: 'uint256' }] },
];

function account() {
  const source = readFileSync(process.env.LDC_BUILD_ENV ?? resolve(root, '../.env.build'), 'utf8');
  const match = source.match(/^PRIVATE_KEY\s*=\s*([^\r\n]+)$/m);
  if (!match) throw new Error('PRIVATE_KEY is missing from the configured build environment');
  const key = match[1].trim().replace(/^['"`]|['"`]$/g, '');
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(key)) throw new Error('PRIVATE_KEY must be a 32-byte hex key');
  return privateKeyToAccount((key.startsWith('0x') ? key : `0x${key}`));
}

function saveCall(data, action) {
  const sender = account().address;
  const txData = encodeFunctionData({ abi, functionName: action.name, args: action.args });
  writeFileSync(`${tmp}-data`, txData, { mode: 0o600 });
  writeFileSync(`${tmp}-estimate.json`, JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_estimateGas', params: [{ from: sender, to: registry, data: txData, value: '0x0' }] }), { mode: 0o600 });
  process.stdout.write(JSON.stringify({ from: sender, proposalId: action.proposalId, organizationId: action.organizationId ?? null }));
}

const mode = process.argv[2];
if (mode === 'prepare') {
  if (!/^0x[0-9a-f]{40}$/.test(registry)) throw new Error('BASE_REGISTRY_ADDRESS is invalid');
  const action = process.argv[3];
  if (action === 'create') {
    const id = proposalId('ldc-studionet-base-smoke-create-20261011');
    const organizationId = idFromProposal('create', id);
    saveCall(null, { name: 'createOrganization', proposalId: id, organizationId, args: [id, '0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640', 'StudioNet Research DAO', 'research', 'A real Base Sepolia registry lifecycle verification DAO.', keccak256(stringToHex('bounded research constitution')), 10_000n] });
  } else if (action === 'evolve') {
    const previousId = process.argv[4];
    if (!/^0x[0-9a-fA-F]{64}$/.test(previousId ?? '')) throw new Error('Provide the created organization ID');
    const id = proposalId('ldc-studionet-base-smoke-evolve-20261011');
    const organizationId = idFromProposal('evolve', id);
    saveCall(null, { name: 'evolveOrganization', proposalId: id, organizationId, args: [id, previousId, 'StudioNet Research DAO v2', 'research', 'An evolved research institution with expanded peer review.', keccak256(stringToHex('expanded bounded research constitution')), 2_000n] });
  } else if (action === 'retire') {
    const organizationId = process.argv[4];
    if (!/^0x[0-9a-fA-F]{64}$/.test(organizationId ?? '')) throw new Error('Provide the evolved organization ID');
    const id = proposalId('ldc-studionet-base-smoke-retire-20261011');
    saveCall(null, { name: 'retireOrganization', proposalId: id, organizationId, args: [id, organizationId] });
  } else if (action === 'read') {
    const which = process.argv[4];
    const calldata = which === 'count' ? encodeFunctionData({ abi, functionName: 'organizationCount' }) : encodeFunctionData({ abi, functionName: 'getOrganization', args: [which] });
    writeFileSync(`${tmp}-call.json`, JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: registry, data: calldata }, 'latest'] }), { mode: 0o600 });
    process.stdout.write('read');
  } else {
    throw new Error('Provide create, evolve, retire, or read');
  }
} else if (mode === 'sign') {
  const [nonce, gas, gasPrice] = process.argv.slice(3);
  if (![nonce, gas, gasPrice].every((value) => /^0x[0-9a-fA-F]+$/.test(value ?? ''))) throw new Error('Invalid RPC transaction fields');
  const raw = await account().signTransaction({ chainId: 84532, nonce: BigInt(nonce), gas: BigInt(gas) * 120n / 100n, gasPrice: BigInt(gasPrice), to: registry, value: 0n, data: readFileSync(`${tmp}-data`, 'utf8').trim() });
  writeFileSync(`${tmp}-raw`, raw, { mode: 0o600 });
  process.stdout.write('Signed lifecycle transaction.');
} else if (mode === 'decode') {
  const receipt = JSON.parse(readFileSync(0, 'utf8')).result;
  if (!receipt || receipt.status !== '0x1') throw new Error('Lifecycle transaction reverted or is not mined');
  const logs = parseEventLogs({ abi, logs: receipt.logs, strict: false }).map((log) => jsonSafe({ event: log.eventName, ...log.args }));
  process.stdout.write(JSON.stringify({ status: receipt.status, logs }));
} else if (mode === 'read-result') {
  const which = process.argv[3];
  const raw = JSON.parse(readFileSync(0, 'utf8')).result;
  if (which === 'count') process.stdout.write(String(decodeFunctionResult({ abi, functionName: 'organizationCount', data: raw })));
  else process.stdout.write(JSON.stringify(jsonSafe(decodeFunctionResult({ abi, functionName: 'getOrganization', data: raw }))));
} else if (mode === 'rpc-result') {
  const response = JSON.parse(readFileSync(0, 'utf8'));
  if (response.error) throw new Error(response.error.message ?? JSON.stringify(response.error));
  process.stdout.write(String(response.result));
} else {
  throw new Error('Use prepare, sign, decode, read-result, or rpc-result');
}
