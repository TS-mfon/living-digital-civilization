import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { concatHex, keccak256, stringToHex } from 'viem';
import type { OrganizationRow, ProposalRow } from './domain.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const path = resolve(projectRoot, process.env.DATABASE_PATH ?? './data/civilization.sqlite');
mkdirSync(dirname(path), { recursive: true });
export const db = new Database(path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), digest TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, revoked_at TEXT);
CREATE INDEX IF NOT EXISTS api_keys_digest_idx ON api_keys(digest);
CREATE TABLE IF NOT EXISTS proposals (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), action TEXT NOT NULL,
 parent_id TEXT, organization_id TEXT, name TEXT NOT NULL, organization_type TEXT NOT NULL,
 purpose TEXT NOT NULL, constitution TEXT NOT NULL, allocation INTEGER NOT NULL,
 status TEXT NOT NULL, evaluation TEXT, genlayer_tx TEXT, base_tx TEXT, error TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS proposals_agent_idx ON proposals(agent_id, created_at DESC);
CREATE TABLE IF NOT EXISTS organizations (
 id TEXT PRIMARY KEY, family_id TEXT NOT NULL, parent_id TEXT, previous_id TEXT, name TEXT NOT NULL,
 organization_type TEXT NOT NULL, purpose TEXT NOT NULL, constitution TEXT NOT NULL,
 generation INTEGER NOT NULL, version INTEGER NOT NULL, resource_units INTEGER NOT NULL,
 status TEXT NOT NULL, address TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS organizations_parent_idx ON organizations(parent_id);
CREATE TABLE IF NOT EXISTS activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT, proposal_id TEXT, organization_id TEXT,
 event TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
`);

export const GENESIS_ID = keccak256(stringToHex('LDC_GENESIS'));
const now = () => new Date().toISOString();
export function seedGenesis(): void {
  const row = db.prepare('SELECT id FROM organizations WHERE id=?').get(GENESIS_ID);
  if (!row) {
    db.prepare(`INSERT INTO organizations(id,family_id,parent_id,previous_id,name,organization_type,purpose,constitution,generation,version,resource_units,status,address,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(GENESIS_ID, keccak256(concatHex([stringToHex('FAMILY'), GENESIS_ID])), null, null, 'Living Civilization', 'civilization', 'Create and evolve useful institutions within an immutable constitutional core.', 'Immutable constitutional core; bounded authority; transparent lineage; resource accounting.', 0, 1, 1_000_000, 'active', null, now());
  }
}
seedGenesis();

const proposalColumns = `id,agent_id as agentId,action,parent_id as parentId,organization_id as organizationId,name,organization_type as type,purpose,constitution,allocation,status,evaluation,genlayer_tx as genlayerTx,base_tx as baseTx,error,created_at as createdAt,updated_at as updatedAt`;
export function getProposal(id: string): ProposalRow | undefined { return db.prepare(`SELECT ${proposalColumns} FROM proposals WHERE id=?`).get(id) as ProposalRow | undefined; }
export function getOrganizations(): OrganizationRow[] { return db.prepare(`SELECT id,family_id as familyId,parent_id as parentId,previous_id as previousId,name,organization_type as type,purpose,constitution,generation,version,resource_units as resourceUnits,status,address,created_at as createdAt FROM organizations ORDER BY created_at DESC`).all() as OrganizationRow[]; }
export function getOrganization(id: string): OrganizationRow | undefined { return db.prepare(`SELECT id,family_id as familyId,parent_id as parentId,previous_id as previousId,name,organization_type as type,purpose,constitution,generation,version,resource_units as resourceUnits,status,address,created_at as createdAt FROM organizations WHERE id=?`).get(id) as OrganizationRow | undefined; }
export function recordActivity(event: string, detail: unknown, proposalId: string | null = null, organizationId: string | null = null): void { db.prepare('INSERT INTO activity(proposal_id,organization_id,event,detail,created_at) VALUES(?,?,?,?,?)').run(proposalId, organizationId, event, JSON.stringify(detail), now()); }
export function getActivity(limit = 50) { return db.prepare('SELECT id,proposal_id as proposalId,organization_id as organizationId,event,detail,created_at as createdAt FROM activity ORDER BY id DESC LIMIT ?').all(limit); }
export function updateProposal(id: string, changes: Partial<Pick<ProposalRow, 'status'|'evaluation'|'genlayerTx'|'baseTx'|'error'>>): void {
  const cols: Record<string, string> = { status: 'status', evaluation: 'evaluation', genlayerTx: 'genlayer_tx', baseTx: 'base_tx', error: 'error' };
  const entries = Object.entries(changes).filter(([key, value]) => cols[key] && value !== undefined);
  if (!entries.length) return;
  db.prepare(`UPDATE proposals SET ${entries.map(([key]) => `${cols[key]}=?`).join(',')},updated_at=? WHERE id=?`).run(...entries.map(([, value]) => value ?? null), now(), id);
}
export function insertOrganization(org: OrganizationRow): void {
  db.prepare(`INSERT INTO organizations(id,family_id,parent_id,previous_id,name,organization_type,purpose,constitution,generation,version,resource_units,status,address,created_at)
    VALUES(@id,@familyId,@parentId,@previousId,@name,@type,@purpose,@constitution,@generation,@version,@resourceUnits,@status,@address,@createdAt)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,resource_units=excluded.resource_units,address=excluded.address`).run(org);
}
export function setOrganizationStatus(id: string, status: OrganizationRow['status'], units?: number): void {
  db.prepare('UPDATE organizations SET status=?,resource_units=COALESCE(?,resource_units) WHERE id=?').run(status, units ?? null, id);
}
export function setResourceUnits(id: string, units: number): void { db.prepare('UPDATE organizations SET resource_units=? WHERE id=?').run(units, id); }
export function createProposal(row: ProposalRow): void {
  db.prepare(`INSERT INTO proposals(id,agent_id,action,parent_id,organization_id,name,organization_type,purpose,constitution,allocation,status,evaluation,genlayer_tx,base_tx,error,created_at,updated_at)
    VALUES(@id,@agentId,@action,@parentId,@organizationId,@name,@type,@purpose,@constitution,@allocation,@status,@evaluation,@genlayerTx,@baseTx,@error,@createdAt,@updatedAt)`).run(row);
}
