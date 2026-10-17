import { concatHex, isAddressEqual, keccak256, parseAbi, parseEventLogs, stringToHex, zeroAddress, zeroHash, type Address, type Hex, type PublicClient, type TransactionReceipt } from 'viem';
import type { ProposalRow } from '../domain.js';

export const registryAbi = parseAbi([
  'function createOrganization(bytes32 proposalId, bytes32 parentId, string name, string organizationType, string purpose, bytes32 constitutionHash, uint256 allocation) returns (bytes32 id, address instance)',
  'function evolveOrganization(bytes32 proposalId, bytes32 previousId, string name, string organizationType, string purpose, bytes32 constitutionHash, uint256 additionalAllocation) returns (bytes32 id, address instance)',
  'function retireOrganization(bytes32 proposalId, bytes32 organizationId)',
  'function getOrganization(bytes32 id) view returns ((bytes32 id, bytes32 familyId, bytes32 parentId, bytes32 previousVersionId, address instance, uint32 generation, uint32 version, uint256 resourceUnits, uint8 status))',
  'event OrganizationCreated(bytes32 indexed proposalId, bytes32 indexed organizationId, bytes32 indexed parentId, address instance, bytes32 constitutionHash, uint256 resourceUnits)',
  'event OrganizationEvolved(bytes32 indexed proposalId, bytes32 indexed previousId, bytes32 indexed organizationId, address instance, bytes32 constitutionHash, uint32 version)',
  'event OrganizationRetired(bytes32 indexed proposalId, bytes32 indexed organizationId, uint256 returnedResourceUnits)',
]);

export type BaseResult = {
  txHash: string;
  id?: string;
  familyId?: string;
  instance?: string;
  generation?: number;
  version?: number;
  resourceUnits?: number;
  parentResourceUnits?: number;
};

type RegistryReader = Pick<PublicClient, 'readContract'>;
type Receipt = Pick<TransactionReceipt, 'status' | 'to' | 'transactionHash' | 'blockNumber' | 'logs'>;

function requireMatch(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function readRegistryOrganization(client: RegistryReader, address: Address, id: Hex, blockNumber: bigint) {
  const record = await client.readContract({ address, abi: registryAbi, functionName: 'getOrganization', args: [id], blockNumber });
  requireMatch(record.id.toLowerCase() === id.toLowerCase() && record.instance !== zeroAddress && record.familyId !== zeroHash && record.version > 0,
    'Base registry record is missing or invalid at the confirmed block');
  requireMatch(record.resourceUnits <= BigInt(Number.MAX_SAFE_INTEGER) && record.status <= 2,
    'Base registry record has invalid resources or status');
  return record;
}

export async function baseResultFromReceipt(
  client: RegistryReader,
  address: Address,
  proposal: Pick<ProposalRow, 'id' | 'action' | 'parentId' | 'organizationId' | 'allocation'>,
  constitution: Hex,
  receipt: Receipt,
): Promise<BaseResult> {
  requireMatch(receipt.status === 'success', 'Base registry transaction reverted');
  requireMatch(receipt.to && isAddressEqual(receipt.to, address), 'Base receipt targets a different registry');
  const events = parseEventLogs({ abi: registryAbi, logs: receipt.logs.filter((log) => isAddressEqual(log.address, address)), strict: true });
  const event = events[0];
  requireMatch(events.length === 1 && event, 'Base receipt must contain one registry lifecycle event');
  requireMatch(event.args.proposalId === keccak256(stringToHex(proposal.id)), 'Base event belongs to a different proposal');

  // A provider's "latest" state can lag its receipt response. Read all related
  // records at that receipt's block and refuse an empty mapping result.
  const record = await readRegistryOrganization(client, address, event.args.organizationId, receipt.blockNumber);
  const parent = await readRegistryOrganization(client, address, record.parentId, receipt.blockNumber);
  if (proposal.action === 'retire') {
    requireMatch(event.eventName === 'OrganizationRetired' && record.id.toLowerCase() === proposal.organizationId?.toLowerCase(), 'Base retirement event does not match the proposal');
    requireMatch(record.status === 2 && record.resourceUnits === 0n, 'Base retirement is not reflected in registry state');
  } else {
    requireMatch(event.eventName !== 'OrganizationRetired' && isAddressEqual(record.instance, event.args.instance) && event.args.constitutionHash === constitution,
      'Base organization instance or constitution does not match the receipt');
    requireMatch(record.status === 0, 'Base organization is not active at the receipt block');
    if (proposal.action === 'create') {
      requireMatch(event.eventName === 'OrganizationCreated' && record.parentId.toLowerCase() === proposal.parentId?.toLowerCase() && event.args.parentId === record.parentId,
        'Base creation has a different parent');
      requireMatch(record.previousVersionId === zeroHash && record.version === 1 && record.generation === parent.generation + 1 && record.familyId === keccak256(concatHex([stringToHex('FAMILY'), record.id])),
        'Base creation lineage is inconsistent');
      requireMatch(record.resourceUnits === BigInt(proposal.allocation) && event.args.resourceUnits === record.resourceUnits, 'Base creation allocation is inconsistent');
    } else {
      requireMatch(event.eventName === 'OrganizationEvolved' && event.args.previousId.toLowerCase() === proposal.organizationId?.toLowerCase() && record.previousVersionId === event.args.previousId,
        'Base evolution has a different predecessor');
      const previous = await readRegistryOrganization(client, address, event.args.previousId, receipt.blockNumber);
      requireMatch(previous.status === 1 && record.parentId === previous.parentId && record.familyId === previous.familyId && record.generation === previous.generation && record.version === previous.version + 1 && event.args.version === record.version,
        'Base evolution lineage is inconsistent');
      requireMatch(record.resourceUnits === previous.resourceUnits + BigInt(proposal.allocation), 'Base evolution allocation is inconsistent');
    }
  }
  return {
    txHash: receipt.transactionHash, id: record.id, familyId: record.familyId, instance: record.instance,
    generation: record.generation, version: record.version, resourceUnits: Number(record.resourceUnits),
    parentResourceUnits: Number(parent.resourceUnits),
  };
}
