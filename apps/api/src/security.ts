import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';

const pepper = process.env.API_KEY_PEPPER || (process.env.NODE_ENV === 'production' ? '' : 'ldc-local-demo-only-pepper-change-before-deploy');
if (!pepper || (process.env.NODE_ENV === 'production' && pepper.length < 32)) throw new Error('API_KEY_PEPPER must contain at least 32 characters in production');

export type Agent = { id: string; name: string };
export function issueKey(agentId: string): { id: string; secret: string } {
  const id = randomUUID();
  const secret = `ldc_${id}.${randomBytes(32).toString('base64url')}`;
  const digest = createHmac('sha256', pepper).update(secret).digest('hex');
  db.prepare('INSERT INTO api_keys(id,agent_id,digest,created_at) VALUES(?,?,?,?)').run(id, agentId, digest, new Date().toISOString());
  return { id, secret };
}
export function authenticate(secret: string | undefined): Agent | null {
  if (!secret) return null;
  const digest = createHmac('sha256', pepper).update(secret).digest('hex');
  const row = db.prepare(`SELECT agents.id,agents.name,api_keys.digest FROM api_keys JOIN agents ON agents.id=api_keys.agent_id WHERE api_keys.digest=? AND api_keys.revoked_at IS NULL`).get(digest) as { id: string; name: string; digest: string } | undefined;
  if (!row) return null;
  const actual = Buffer.from(row.digest, 'hex');
  const expected = Buffer.from(digest, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: row.id, name: row.name };
}
export function revokeKey(agentId: string, keyId: string): boolean {
  return db.prepare('UPDATE api_keys SET revoked_at=? WHERE id=? AND agent_id=? AND revoked_at IS NULL').run(new Date().toISOString(), keyId, agentId).changes === 1;
}
