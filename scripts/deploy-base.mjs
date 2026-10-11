import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = process.env.LDC_BUILD_ENV ?? resolve(root, '../.env.build');
const source = readFileSync(envFile, 'utf8');
const match = source.match(/^PRIVATE_KEY\s*=\s*([^\r\n]+)$/m);
if (!match) throw new Error('PRIVATE_KEY is missing from /home/sudodave/.env.build');
const rawKey = match[1].trim().replace(/^['"`]|['"`]$/g, '');
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(rawKey)) throw new Error('PRIVATE_KEY must be a 32-byte hex key');

const result = spawnSync('forge', [
  'script', 'script/Deploy.s.sol:Deploy', '--root', 'contracts/base', '--broadcast',
  '--rpc-url', process.env.BASE_RPC_URL ?? 'https://sepolia.base.org',
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PRIVATE_KEY: rawKey.startsWith('0x') ? rawKey : `0x${rawKey}` },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const broadcastPath = resolve(root, 'contracts/base/broadcast/Deploy.s.sol/84532/run-latest.json');
const broadcast = JSON.parse(readFileSync(broadcastPath, 'utf8'));
const deployment = broadcast.transactions.find((transaction) => transaction.contractName === 'CivilizationRegistry' && transaction.contractAddress);
if (!deployment) throw new Error('Deployment receipt contains no CivilizationRegistry address');
console.log(`BASE_REGISTRY_ADDRESS=${deployment.contractAddress}`);
