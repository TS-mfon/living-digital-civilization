import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodeDeployData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const root = resolve(import.meta.dirname, '../../../');
const buildEnv = process.env.LDC_BUILD_ENV ?? resolve(root, '../.env.build');
const temp = '/tmp/ldc-base-deploy';

function readPrivateKey() {
  const source = readFileSync(buildEnv, 'utf8');
  const match = source.match(/^PRIVATE_KEY\s*=\s*([^\r\n]+)$/m);
  if (!match) throw new Error('PRIVATE_KEY is missing from the configured build environment');
  const raw = match[1].trim().replace(/^['"`]|['"`]$/g, '');
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(raw)) throw new Error('PRIVATE_KEY must be a 32-byte hex key');
  return (raw.startsWith('0x') ? raw : `0x${raw}`);
}

const mode = process.argv[2];
if (mode === 'prepare') {
  const artifactPath = resolve(root, 'contracts/base/out/CivilizationRegistry.sol/CivilizationRegistry.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const account = privateKeyToAccount(readPrivateKey());
  const data = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: [
      'Living Civilization',
      'Create and evolve useful institutions within an immutable constitutional core.',
      1_000_000n,
    ],
  });
  writeFileSync(`${temp}-data`, data, { mode: 0o600 });
  writeFileSync(`${temp}-estimate.json`, JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'eth_estimateGas',
    params: [{ from: account.address, data, value: '0x0' }],
  }), { mode: 0o600 });
  process.stdout.write(account.address);
} else if (mode === 'sign') {
  const [nonceHex, gasHex, gasPriceHex] = process.argv.slice(3);
  if (![nonceHex, gasHex, gasPriceHex].every((value) => /^0x[0-9a-fA-F]+$/.test(value ?? ''))) throw new Error('Invalid RPC transaction fields');
  const account = privateKeyToAccount(readPrivateKey());
  const rawTransaction = await account.signTransaction({
    chainId: 84532,
    nonce: BigInt(nonceHex),
    gas: (BigInt(gasHex) * 120n) / 100n,
    gasPrice: BigInt(gasPriceHex),
    value: 0n,
    data: readFileSync(`${temp}-data`, 'utf8').trim(),
  });
  writeFileSync(`${temp}-raw`, rawTransaction, { mode: 0o600 });
  process.stdout.write('Signed deployment transaction is ready.');
} else if (mode === 'rpc-result') {
  const response = JSON.parse(readFileSync(0, 'utf8'));
  if (response.error) throw new Error(response.error.message ?? JSON.stringify(response.error));
  process.stdout.write(String(response.result));
} else if (mode === 'receipt') {
  const response = JSON.parse(readFileSync(0, 'utf8'));
  if (response.error) throw new Error(response.error.message ?? JSON.stringify(response.error));
  if (!response.result) { process.stdout.write('PENDING'); process.exit(2); }
  if (response.result.status !== '0x1' || !response.result.contractAddress) throw new Error('Base registry deployment transaction reverted or has no contract address');
  process.stdout.write(response.result.contractAddress);
} else {
  throw new Error('Use prepare, sign, rpc-result, or receipt');
}
