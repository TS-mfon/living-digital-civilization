import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { decodeFunctionData, fromRlp, parseAbi } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

test('StudioNet evaluation uses its five-argument consensus ABI, not the fee-envelope ABI', async (context) => {
  const requests: string[] = [];
  context.mock.method(globalThis, 'fetch', async (_input: unknown, init: RequestInit) => {
    const request = JSON.parse(init.body as string);
    requests.push(request.method);
    const results: Record<string, string> = {
      eth_getTransactionCount: '0x0',
      eth_estimateGas: '0x30d40',
      eth_gasPrice: '0x0',
    };
    assert.ok(request.method in results, `Unexpected RPC request: ${request.method}`);
    return Response.json({ jsonrpc: '2.0', id: request.id, result: results[request.method] });
  });
  const signer = privateKeyToAccount(generatePrivateKey());
  const evaluator = '0x4601Ad453da13B11d240b4943f9BB026108C9Ce4';
  const captured = new Error('Captured unsigned transaction; no broadcast');
  const account = {
    ...signer,
    signTransaction: async (transaction: Parameters<typeof signer.signTransaction>[0]): Promise<`0x${string}`> => {
      assert.equal(transaction.to?.toLowerCase(), studionet.consensusMainContract!.address.toLowerCase());
      assert.equal(transaction.chainId, 61999);
      assert.equal(transaction.value, 0n);
      const decoded = decodeFunctionData({
        abi: parseAbi(['function addTransaction(address sender, address recipient, uint256 validators, uint256 rotations, bytes data)']),
        data: transaction.data!,
      });
      assert.equal(decoded.functionName, 'addTransaction');
      assert.equal(decoded.args[0], signer.address);
      assert.equal(decoded.args[1], evaluator);
      assert.equal(decoded.args[2], 5n);
      assert.equal(decoded.args[3], 3n);
      const payload = fromRlp(decoded.args[4], 'hex');
      assert.ok(Array.isArray(payload));
      assert.equal(payload.length, 2);
      assert.equal(payload[1], '0x00');
      assert.ok(payload[0].includes(Buffer.from('evaluate').toString('hex')));
      throw captured;
    },
  };
  const client = createClient({ chain: studionet, account });
  await assert.rejects(client.writeContract({
    address: evaluator,
    functionName: 'evaluate',
    value: 0n,
    args: ['transport-regression', 'create', '', 'parent', 'Civic Infrastructure', 'infrastructure', 'Maintain civic infrastructure', 'Limited authority', 500],
  }), (error: unknown) => error === captured);
  assert.deepEqual(requests, ['eth_getTransactionCount', 'eth_estimateGas', 'eth_gasPrice']);
});
