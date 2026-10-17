import { concatHex, createPublicClient, createWalletClient, http, keccak256, stringToHex, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { ProposalRow } from './domain.js';
import { evaluationConsensus } from './protocol/evaluationConsensus.js';
import { baseResultFromReceipt, registryAbi, type BaseResult } from './protocol/baseReceipt.js';

const demoMode = process.env.DEMO_MODE === 'true';

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
  // genlayer-js is pinned to 1.1.8 for StudioNet's five-argument addTransaction
  // ABI. The 2.0 fee envelope finalizes there without executing the evaluator.
  return await client.writeContract({ account: genlayerAccount, address, functionName: 'evaluate', args, value: 0n });
}

export async function finalizedEvaluation(proposal: ProposalRow): Promise<{ approved: boolean; rationale: string; constitution: string } | null> {
  if (demoMode) {
    const blocked = /bypass|malware|unrestricted authority|evade (law|safety)/i.test(`${proposal.purpose}\n${proposal.constitution}`);
    return { approved: !blocked && (proposal.action === 'retire' || proposal.purpose.trim().length >= 10), rationale: blocked ? 'The request conflicts with fixed institutional safety boundaries.' : 'Demo evaluation: the request passed basic structural and safety checks. This is simulated, not a GenLayer consensus result.', constitution: proposal.constitution || `Mission: ${proposal.purpose}\nAuthority: limited to ${proposal.type} operations.\nResources: use only assigned units and publish material decisions.\nReview: periodically assess mission fit and report conflicts.` };
  }
  const client = await getGenLayer();
  const transaction = await client.getTransaction({ hash: proposal.genlayerTx as `0x${string}` });
  const consensus = evaluationConsensus(transaction);
  if (consensus === 'pending') return null;
  if (consensus === 'rejected') {
    return { approved: false, rationale: 'GenLayer validators did not reach an approving consensus for this proposal.', constitution: proposal.constitution };
  }
  const result = await client.readContract({ address: genlayerAddress!, functionName: 'get_evaluation', args: [proposal.id] });
  if (!result || typeof result !== 'object' || !('approved' in result)) throw new Error('Finalized GenLayer transaction has no readable evaluation');
  return result as { approved: boolean; rationale: string; constitution: string };
}

export async function relayToBase(proposal: ProposalRow, evaluation: { constitution: string }, onSubmitted: (hash: string) => Promise<void>): Promise<BaseResult> {
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
  const hash = proposal.baseTx ?? await walletBase!.writeContract({ account, address, chain: baseSepolia, abi: registryAbi, functionName, args: args as any });
  // Keep the transaction available for recovery even if receipt/state reads fail.
  await onSubmitted(hash);
  const receipt = await publicBase!.waitForTransactionReceipt({ hash });
  return baseResultFromReceipt(publicBase, address, proposal, constitutionHash(evaluation.constitution), receipt);
}

export async function adapterHealth() {
  if (demoMode) return { mode: 'demo', base: 'simulated', genlayer: 'simulated' };
  const [chainId, gen] = await Promise.allSettled([publicBase!.getChainId(), getGenLayer()]);
  return { mode: 'testnet', base: chainId.status === 'fulfilled' && chainId.value === 84532 ? 'connected' : 'unavailable', genlayer: gen.status === 'fulfilled' ? 'configured' : 'unavailable' };
}
