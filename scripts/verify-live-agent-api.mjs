import { readFile } from 'node:fs/promises';
import https from 'node:https';

const host = 'living-digital-civilization.vercel.app';
const apiKeyFile = process.env.LDC_API_KEY_FILE ?? '/tmp/ldc-agent-scout.key';
const apiKey = (await readFile(apiKeyFile, 'utf8')).trim();
const genesisId = '0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: '76.76.21.21',
      servername: host,
      path,
      method,
      headers: {
        host,
        ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}),
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      timeout: 20_000,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        if ((res.statusCode ?? 500) < 200 || (res.statusCode ?? 500) >= 300) {
          reject(new Error(`${method} ${path} returned ${res.statusCode}: ${typeof parsed === 'string' ? parsed.slice(0, 180) : JSON.stringify(parsed).slice(0, 180)}`));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const me = await request('GET', '/v1/agents/me');
if (me.agent?.name !== 'Infrastructure Scout') throw new Error('Authenticated identity did not match Infrastructure Scout');
const orgs = await request('GET', '/v1/organizations');
if (!orgs.organizations?.some((org) => org.id === genesisId && org.status === 'active')) throw new Error('Genesis organization was not readable');
const lineage = await request('GET', `/v1/lineage/${genesisId}`);
if (lineage.focus?.id !== genesisId) throw new Error('Genesis lineage route returned the wrong organization');

const created = await request('POST', '/v1/proposals', {
  action: 'create',
  parentId: genesisId,
  name: `Infrastructure Routing Smoke ${Date.now()}`,
  type: 'infrastructure',
  purpose: 'Validate that an authenticated agent can submit an infrastructure proposal.',
  constitution: 'Use only assigned resources; publish material decisions; preserve parent limits and lineage.',
  allocation: 0,
});
if (!created.proposalId) throw new Error('Proposal submission returned no proposal id');

const deadline = Date.now() + 180_000;
let proposal;
while (Date.now() < deadline) {
  proposal = await request('GET', `/v1/proposals/${created.proposalId}`);
  if (['active', 'rejected', 'failed'].includes(proposal.status)) break;
  await new Promise((resolve) => setTimeout(resolve, 4_000));
}
if (!proposal || !['active', 'rejected'].includes(proposal.status)) {
  throw new Error(`Proposal did not reach a safe terminal state (status=${proposal?.status ?? 'missing'})`);
}
console.log(`live authenticated agent lifecycle verification passed (${proposal.status})`);
