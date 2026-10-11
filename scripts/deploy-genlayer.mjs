import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = process.env.LDC_BUILD_ENV ?? resolve(root, '../.env.build');
const source = readFileSync(envFile, 'utf8');
const match = source.match(/^PRIVATE_KEY\s*=\s*([^\r\n]+)$/m);
if (!match) throw new Error('PRIVATE_KEY is missing from the configured build environment file');
const rawKey = match[1].trim().replace(/^['"`]|['"`]$/g, '');
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(rawKey)) throw new Error('PRIVATE_KEY must be a 32-byte hex key');
const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
const keyDir = resolve(homedir(), '.genlayer');
const passwordFile = resolve(keyDir, 'ldc-bradbury-deployer.password');
mkdirSync(keyDir, { recursive: true, mode: 0o700 });
if (!existsSync(passwordFile)) writeFileSync(passwordFile, randomBytes(32).toString('base64url'), { flag: 'wx', mode: 0o600 });
chmodSync(passwordFile, 0o600);
if ((statSync(passwordFile).mode & 0o077) !== 0) throw new Error('GenLayer deployer password file must be private to the current user');
const password = readFileSync(passwordFile, 'utf8').trim();
const account = 'ldc-bradbury-deployer';

function run(args, input) {
  const result = spawnSync('genlayer', args, { cwd: root, input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.replaceAll(privateKey, '[redacted]');
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(out);
    process.exit(result.status ?? 1);
  }
  return out;
}

function summarize(output) {
  const lines = output.split(/\r?\n/).filter((line) => /Transaction Hash|Contract Address|status_name|resultName|txExecutionResultName|Error:|execution error|execution failed|Execution Result|Contract deployed|Invalid password/i.test(line));
  return lines.join('\n').slice(-5000);
}

const listedAccounts = run(['account', 'list'], '');
if (!listedAccounts.includes(account)) {
  const accountOutput = run(['account', 'import', '--name', account, '--private-key', privateKey, '--password', password], '');
  process.stdout.write(accountOutput);
}
run(['account', 'use', account], '');
const deploymentOutput = run(['deploy', '--contract', 'contracts/genlayer/institutional_evaluator.py'], `${password}\n`);
process.stdout.write(`${summarize(deploymentOutput)}\n`);
const tx = deploymentOutput.match(/0x[0-9a-fA-F]{64}/)?.[0];
if (tx) {
  const receiptOutput = run(['receipt', tx, '--stdout', '--stderr'], `${password}\n`);
  process.stdout.write(`${summarize(receiptOutput)}\n`);
  if (/FINISHED_WITH_ERROR|Invalid password|Execution Error|Error retrieving transaction receipt/i.test(deploymentOutput + receiptOutput)) {
    throw new Error('GenLayer deployment transaction did not execute successfully; inspect the receipt output above.');
  }
}
