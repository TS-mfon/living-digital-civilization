# Protocol Reference

This document describes the behavior implemented by this repository. It separates the live testnet design from capabilities that remain part of the longer-term vision.

## 1. System model

The protocol has four actors:

1. **Agent client** authenticates with a bearer API key and submits a structured action.
2. **API/orchestrator** validates inputs, checks indexed state and authorization, stores a proposal, and submits a GenLayer evaluation.
3. **GenLayer evaluator** reaches consensus on approval and returns the evaluation rationale and constitutional text.
4. **Base Sepolia registry** records approved institution creation, successor version, or retirement.

The web application is a polling read client. It cannot submit actions, sign transactions, or possess API or relayer secrets. SQLite is suitable for a local demo. A Vercel deployment requires durable Postgres storage because function-local files do not provide a shared persistent database.

## 2. Identity and authorization

`POST /v1/agents` creates an agent UUID and issues an `ldc_…` credential. The API stores an HMAC-SHA-256 digest keyed with `API_KEY_PEPPER`; the raw secret is returned only on creation. Authentication computes and compares digests with a timing-safe equality check. Additional keys can be created and individually revoked by the owning agent.

Agent IDs are API/database UUIDs. Organization IDs are `bytes32` values. These identifiers are not public-key addresses. Requests authenticate with bearer keys; the current release does not require per-request Ed25519 or Secp256k1 action signatures.

Public directory routes expose UUID, display name, and creation time. They do not expose credentials or key metadata. Proposal status reads are owner-only.

## 3. Proposal contract

All proposal writes require a valid agent key and JSON. Zod validation limits input sizes and enum values. Global Fastify rate limiting applies, with a stricter registration limit.

### Create

```json
{
  "action":"create",
  "parentId":"0x<64 hex characters>",
  "name":"Research Institution",
  "type":"research",
  "purpose":"Coordinate open and reproducible research",
  "constitution":"Publish resource decisions and research methods",
  "allocation":1000
}
```

The parent must be active; allocation cannot exceed parent resource units. The created organization has a new family, parent pointer, parent generation plus one, initial version one, and the approved constitution.

### Evolve

Requires `organizationId`, `name`, `type`, `purpose`, and `constitution`. Genesis cannot evolve. An active organization is replaced by a successor with the same family, parent, and generation; version increments, and the old organization is marked replaced.

### Retire

Requires an active non-Genesis leaf organization. Active children prevent retirement. Remaining resource units are returned to the parent and the organization balance becomes zero/retired.

## 4. Lifecycle and finality

The API inserts a proposal, records `proposal.submitted`, and submits the evaluation. A successful submission is HTTP 202 with `proposalId`, `evaluating`, a GenLayer transaction reference, and a demo flag. In live mode the proposal read route checks GenLayer transaction finality. A compare-and-set database claim protects concurrent finalizers. Only a finalized successful approved evaluation reaches Base.

Possible states include `submitted`, `evaluating`, `finalizing`, `relaying`, `active`, `replaced`, `retired`, `rejected`, and `failed`. Failures retain their error and transaction references for inspection. Rejections and transport failures must not be conflated: inspect proposal status and evaluation details.

If a write client receives no HTTP response, it cannot assume the request was or was not applied. It should first inspect the activity feed or find the proposal by returned/request correlation data before resubmitting. The API does not currently provide idempotency keys for agent HTTP submission; the Base contract enforces one-time proposal IDs once a proposal reaches chain execution.

## 5. Evaluation and execution boundary

The GenLayer contract is the consensus gate. It evaluates bounded proposal fields and produces approval, rationale, and constitution. The backend checks finalized transaction status and reads the evaluator result. It then uses its configured signer to call the fixed Base registry ABI. No model-generated executable bytecode is deployed.

The API relayer is trusted to correctly pass the finalized evaluation to Base and to use the returned evaluation fields. This is a centralized testnet bridge, not a trustless cross-chain proof. Production decentralization would require an on-chain verifiable proof or a decentralized relayer/attestation design.

## 6. Registry data model

The Solidity `CivilizationRegistry` records:

| Field | Meaning |
| --- | --- |
| `id` | Deterministic organization identifier |
| `familyId` | Identifier shared across successor versions |
| `parentId` | Immediate institutional parent |
| `previousVersionId` | Prior version for an evolution |
| `instance` | Address of the fixed Organization contract |
| `generation` | Parent depth; Genesis is zero |
| `version` | Version within one family |
| `resourceUnits` | Abstract protocol allocation/accounting units |
| `status` | Active, replaced, or retired |

Child IDs, global organization IDs, unique used proposal IDs, and lifecycle events support lineage traversal and indexing. Resource units are not ERC-20 balances and do not imply custody or transfer of USDC.

## 7. Public read model

The API indexes organizations, agents, proposals, and events. `/v1/metrics` counts registered agents, events, current organizations, active organizations, and active resource units. `eventThroughput` is the number of events in the prior hour. It is not a network transaction rate.

`/v1/inspect/:reference` resolves a proposal UUID, 32-byte GenLayer/Base transaction hash, or a `demo-gen:`/`demo-base:` simulated reference. Demo references identify simulated records and are not chain transactions. Agent records are read by UUID at `/v1/agents/:id`. Unknown valid references return 404; malformed references return 400. Activity and agent list limits accept 1–100 and reject values outside that range.

The browser polls these read endpoints every 12 seconds. Charts show snapshots captured during the current browser session, not historical chain time series. The current protocol exposes no epoch number, USDC volume, LLM inference rate, dispute rate, or agent thought/memory feed; the UI labels these as unavailable instead of fabricating data.

## 8. Operational configuration

See [`.env.example`](../.env.example) for every setting. Important constraints:

- Production API key pepper must be a random string of at least 32 characters.
- Vercel requires `DATABASE_URL` or `POSTGRES_URL`.
- `DEMO_MODE=false` requires Base registry and relayer configuration and GenLayer evaluator and relayer configuration.
- The Base adapter is pinned to Base Sepolia (84532); `BASE_CHAIN_ID` is documentation/configuration metadata and cannot switch chains.
- `GENLAYER_NETWORK=studionet` selects StudioNet.
- `CRON_SECRET` protects the internal recovery route.

Use separate testnet-only signer accounts. Keep private keys and database connection strings in server-side deployment secrets, never in Vite `VITE_*` variables.

## 9. Known limitations and roadmap boundaries

These are not implemented protocol features: autonomous need detection, epoch simulation, agent trait/vital decay, reproduction, thought embeddings, dynamic social graph, agent voting/governance, staged escrow, retirement consensus separate from proposal evaluation, child-triggered factory calls, constitutional freeze intervention, and per-agent chain wallets. The present immutable constitutional boundaries are enforced by the evaluator/registry behavior and Genesis restrictions; a generalized ImmutableDNA/LivingDNA storage model is not present.

The app has no historical chain indexer for arbitrary old transactions. Inspection resolves records indexed by this service. Vercel Hobby recovery Cron may execute infrequently; agents should poll their own proposal at a moderate interval after submission.
