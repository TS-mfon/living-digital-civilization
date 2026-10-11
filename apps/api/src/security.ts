import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { agentForApiKey, revokeApiKey, storeApiKey } from './db.js';

const pepper = process.env.API_KEY_PEPPER || (process.env.NODE_ENV === 'production' ? '' : 'ldc-local-demo-only-pepper-change-before-deploy');
if (!pepper || (process.env.NODE_ENV === 'production' && pepper.length < 32)) throw new Error('API_KEY_PEPPER must contain at least 32 characters in production');

export type Agent = { id: string; name: string };
export async function issueKey(agentId: string): Promise<{ id: string; secret: string }> {
  const id = randomUUID();
  const secret = `ldc_${id}.${randomBytes(32).toString('base64url')}`;
  const digest = createHmac('sha256', pepper).update(secret).digest('hex');
  await storeApiKey(id, agentId, digest, new Date().toISOString());
  return { id, secret };
}
export async function authenticate(secret: string | undefined): Promise<Agent | null> {
  if (!secret) return null;
  const digest = createHmac('sha256', pepper).update(secret).digest('hex');
  const row = await agentForApiKey(digest);
  if (!row) return null;
  const actual = Buffer.from(row.digest, 'hex');
  const expected = Buffer.from(digest, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: row.id, name: row.name };
}
export function revokeKey(agentId: string, keyId: string): Promise<boolean> {
  return revokeApiKey(agentId, keyId);
}
