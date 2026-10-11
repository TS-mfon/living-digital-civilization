import { concatHex, createPublicClient, createWalletClient, http, keccak256, parseEventLogs, stringToHex, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { ProposalRow } from './domain.js';

const demoMode = process.env.DEMO_MODE === 'true';
const registryAbi = [
  { type: 'function', name: 'createOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'parentId', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'organizationType', type: 'string' }, { name: 'purpose', type: 'string' }, { name: 'constitutionHash', type: 'bytes32' }, { name: 'allocation', type: 'uint256' }], outputs: [{ name: 'id', type: 'bytes32' }, { name: 'instance', type: 'address' }] },
  { type: 'function', name: 'evolveOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'previousId', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'organizationType', type: 'string' }, { name: 'purpose', type: 'string' }, { name: 'constitutionHash', type: 'bytes32' }, { name: 'additionalAllocation', type: 'uint256' }], outputs: [{ name: 'id', type: 'bytes32' }, { name: 'instance', type: 'address' }] },
  { type: 'function', name: 'retireOrganization', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }, { name: 'organizationId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getOrganization', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'familyId', type: 'bytes32' }, { name: 'parentId', type: 'bytes32' }, { name: 'previousVersionId', type: 'bytes32' }, { name: 'instance', type: 'address' }, { name: 'generation', type: 'uint32' }, { name: 'version', type: 'uint32' }, { name: 'resourceUnits', type: 'uint256' }, { name: 'status', type: 'uint8' }] }] },
  { type: 'event', name: 'OrganizationCreated', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: true, name: 'parentId', type: 'bytes32' }, { indexed: false, name: 'instance', type: 'address' }, { indexed: false, name: 'constitutionHash', type: 'bytes32' }, { indexed: false, name: 'resourceUnits', type: 'uint256' }] },
  { type: 'event', name: 'OrganizationEvolved', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'previousId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: false, name: 'instance', type: 'address' }, { indexed: false, name: 'constitutionHash', type: 'bytes32' }, { indexed: false, name: 'version', type: 'uint32' }] },
  { type: 'event', name: 'OrganizationRetired', anonymous: false, inputs: [{ indexed: true, name: 'proposalId', type: 'bytes32' }, { indexed: true, name: 'organizationId', type: 'bytes32' }, { indexed: false, name: 'returnedResourceUnits', type: 'uint256' }] },
] as const;

export const GENESIS_ID = keccak256(stringToHex('LDC_GENESIS'));
const statusName = ['active', 'replaced', 'retired'] as const;
function requireAddress(raw: string | undefined, label: string): Address {
  if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) throw new Error(`${label} is not configured`);
  return raw as Address;
}
function key(raw: string | undefined, label: string): Hex {
  if (!raw || !/^0x[0-9a-fA-F]{64}$/.test(raw)) throw new Error(`${label} is not configured`);
  return raw as Hex;
}

const baseRpc = process.env.BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
let publicBase: any;
let walletBase: any;
let registryAddress: Address | undefined;
if (!demoMode) {
  registryAddress = requireAddress(process.env.BASE_REGISTRY_ADDRESS, 'BASE_REGISTRY_ADDRESS');
  const signer = privateKeyToAccount(key(process.env.BASE_RELAYER_PRIVATE_KEY, 'BASE_RELAYER_PRIVATE_KEY'));
  publicBase = createPublicClient({ chain: baseSepolia, transport: http(baseRpc) });
  walletBase = createWalletClient({ account: signer, chain: baseSepolia, transport: http(baseRpc) });
}

type GenClient = any;
let genlayerClient: GenClient;
let genlayerAccount: any;
let genlayerAddress: Address | undefined;
async function getGenLayer(): Promise<GenClient> {
  if (demoMode) return undefined;
  if (genlayerClient) return genlayerClient;
  genlayerAddress = requireAddress(process.env.GENLAYER_EVALUATOR_ADDRESS, 'GENLAYER_EVALUATOR_ADDRESS');
  const privateKey = key(process.env.GENLAYER_RELAYER_PRIVATE_KEY, 'GENLAYER_RELAYER_PRIVATE_KEY');
  genlayerAccount = privateKeyToAccount(privateKey);
  const [{ createClient }, chains] = await Promise.all([import('genlayer-js'), import('genlayer-js/chains')]);
  const network = process.env.GENLAYER_NETWORK ?? 'studionet';
  const chain = (chains as any)[network];
  if (!chain) throw new Error(`The installed GenLayerJS package does not expose ${network}`);
  genlayerClient = createClient({ chain, account: genlayerAccount });
  return genlayerClient;
}

export function isDemoMode(): boolean { return demoMode; }
export function proposalHash(id: string): Hex { return keccak256(stringToHex(id)); }
export function constitutionHash(constitution: string): Hex { return keccak256(stringToHex(constitution)); }
export function familyHash(id: Hex): Hex { return keccak256(concatHex([stringToHex('FAMILY'), id])); }

export async function submitEvaluation(proposal: ProposalRow): Promise<string> {
  if (demoMode) return `demo-gen:${proposal.id}`;
  const client = await getGenLayer();
  const address = genlayerAddress!;
  const args = [proposal.id, proposal.action, proposal.organizationId ?? '', proposal.parentId ?? '', proposal.name, proposal.type, proposal.purpose, proposal.constitution, proposal.allocation];
  if ((process.env.GENLAYER_NETWORK ?? 'studionet') === 'studionet') {
    // StudioNet is gasless and currently does not expose sim_getFeeConfig.
    return await client.writeContract({ account: genlayerAccount, address, functionName: 'evaluate', args, fees: { feeValue: 0n } });
  }
  const fees = await client.estimateTransactionFeesForWrite({ account: genlayerAccount, address, functionName: 'evaluate', args });
  return await client.writeContract({ account: genlayerAccount, address, functionName: 'evaluate', args, fees });
}

export async function finalizedEvaluation(proposal: ProposalRow): Promise<{ approved: boolean; rationale: string; constitution: string } | null> {
  if (demoMode) {
    const blocked = /bypass|malware|unrestricted authority|evade (law|safety)/i.test(`${proposal.purpose}\n${proposal.constitution}`);
    return { approved: !blocked && (proposal.action === 'retire' || proposal.purpose.trim().length >= 10), rationale: blocked ? 'The request conflicts with fixed institutional safety boundaries.' : 'Demo evaluation: the request passed basic structural and safety checks. This is simulated, not a GenLayer consensus result.', constitution: proposal.constitution || `Mission: ${proposal.purpose}\nAuthority: limited to ${proposal.type} operations.\nResources: use only assigned units and publish material decisions.\nReview: periodically assess mission fit and report conflicts.` };
  }
  const client = await getGenLayer();
  const transaction = await client.getTransaction({ hash: proposal.genlayerTx as `0x${string}` });
  if (transaction.statusName !== 'FINALIZED') return null;
  if (transaction.result_name === 'NO_MAJORITY' || transaction.result_name === 'MAJORITY_DISAGREE') {
    return { approved: false, rationale: 'GenLayer validators did not reach an approving consensus for this proposal.', constitution: proposal.constitution };
  }
  const leaderResult = transaction.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (transaction.result_name !== 'MAJORITY_AGREE' || leaderResult !== 'SUCCESS') {
    throw new Error(`GenLayer transaction completed unsuccessfully (${transaction.result_name ?? transaction.statusName}; execution ${leaderResult ?? 'unknown'})`);
  }
  const result = await client.readContract({ address: genlayerAddress!, functionName: 'get_evaluation', args: [proposal.id] });
  if (!result || typeof result !== 'object' || !('approved' in result)) throw new Error('Finalized GenLayer transaction has no readable evaluation');
  return result as { approved: boolean; rationale: string; constitution: string };
}

export type BaseResult = { txHash: string; id?: string; familyId?: string; instance?: string; generation?: number; version?: number; resourceUnits?: number };
export async function relayToBase(proposal: ProposalRow, evaluation: { constitution: string }): Promise<BaseResult> {
  if (demoMode) {
    const id = keccak256(stringToHex(`${proposal.action}:${proposal.id}`));
    return { txHash: `demo-base:${proposal.id}`, id };
  }
  const account = walletBase!.account!;
  const address = registryAddress!;
  let functionName: 'createOrganization'|'evolveOrganization'|'retireOrganization';
  let args: readonly unknown[];
  if (proposal.action === 'create') {
    functionName = 'createOrganization';
    args = [proposalHash(proposal.id), proposal.parentId as Hex, proposal.name, proposal.type, proposal.purpose, constitutionHash(evaluation.constitution), BigInt(proposal.allocation)];
  } else if (proposal.action === 'evolve') {
    functionName = 'evolveOrganization';
    args = [proposalHash(proposal.id), proposal.organizationId as Hex, proposal.name, proposal.type, proposal.purpose, constitutionHash(evaluation.constitution), BigInt(proposal.allocation)];
  } else {
    functionName = 'retireOrganization';
    args = [proposalHash(proposal.id), proposal.organizationId as Hex];
  }
  const hash = await walletBase!.writeContract({ account, address, chain: baseSepolia, abi: registryAbi, functionName, args: args as any });
  const receipt = await publicBase!.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Base registry transaction reverted');
  if (proposal.action === 'retire') return { txHash: hash };
  const eventName = proposal.action === 'create' ? 'OrganizationCreated' : 'OrganizationEvolved';
  const logs = parseEventLogs({ abi: registryAbi, logs: receipt.logs, eventName, strict: false }) as any[];
  const event = logs[0]?.args;
  if (!event) throw new Error(`Base transaction finalized without ${eventName} event`);
  const id = event.organizationId as Hex;
  const record = await publicBase!.readContract({ address, abi: registryAbi, functionName: 'getOrganization', args: [id] }) as any;
  return { txHash: hash, id, familyId: record.familyId, instance: event.instance, generation: Number(record.generation), version: Number(record.version), resourceUnits: Number(record.resourceUnits) };
}

export async function adapterHealth() {
  if (demoMode) return { mode: 'demo', base: 'simulated', genlayer: 'simulated' };
  const [chainId, gen] = await Promise.allSettled([publicBase!.getChainId(), getGenLayer()]);
  return { mode: 'testnet', base: chainId.status === 'fulfilled' && chainId.value === 84532 ? 'connected' : 'unavailable', genlayer: gen.status === 'fulfilled' ? 'configured' : 'unavailable' };
}
