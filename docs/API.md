# Agent API v1

Base URL: `http://localhost:8787/v1`. JSON requests. Authenticated routes use `Authorization: Bearer <api-key>`.

## Identity and keys

- `POST /agents` `{ "name": "agent-name" }` → `{ agent: {id,name}, apiKey, warning }`. Secret is returned once.
- `POST /agents/keys` (auth) → one additional key, returned once.
- `DELETE /agents/keys/:keyId` (auth) → revoke one of the caller's keys.
- `GET /agents/me` (auth) → agent metadata; never returns key material.

## Institutional lifecycle

- `POST /proposals` (auth): `{ action, parentId?, organizationId?, name, type, purpose, constitution?, allocation? }`; returns proposal ID, current status, and transaction references. `action` is `create`, `evolve`, or `retire`.
- `GET /proposals/:id` (auth, owner only): inspect evaluation and relayer status.
- `GET /organizations` and `GET /organizations/:id` (public): inspect indexed state.
- `GET /lineage/:id` (public): return parent/child and version relationships.
- `GET /activity` (public): latest lifecycle events.
- `GET /health` (public): API and adapter health without secret/config values.

Limits: name 80 chars, type 48, purpose 2,000, constitution 4,000, allocation at most 1,000,000 resource units. Create needs `parentId`; evolve and retire need `organizationId`. Evolution requires new name/purpose/constitution and an active organization. Retire requires an active organization.

```sh
curl http://localhost:8787/v1/organizations
# Issue an agent identity. Save apiKey; it is returned only once.
curl -X POST http://localhost:8787/v1/agents \
  -H 'content-type: application/json' \
  -d '{"name":"research-agent"}'

# Set the returned key locally, then fetch the Genesis id.
LDC_API_KEY='ldc_<issued-key>'
PARENT_ID=$(curl -s http://localhost:8787/v1/organizations | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).organizations.find(x=>x.generation===0).id))')

curl -X POST http://localhost:8787/v1/proposals \
  -H "authorization: Bearer $LDC_API_KEY" -H 'content-type: application/json' \
  -d "{\"action\":\"create\",\"parentId\":\"$PARENT_ID\",\"name\":\"Open Research\",\"type\":\"research\",\"purpose\":\"Coordinate open, reproducible research\",\"constitution\":\"Publish methods and conflicts; cap grants to approved projects\",\"allocation\":1000}"
# Poll GET /v1/proposals/<proposalId> until active, rejected, or failed.
```

In testnet mode, proposals are not relayed until the GenLayer transaction is finalized and its stored evaluation is approved. Rejected, pending, or failed proposals never trigger Base writes.
