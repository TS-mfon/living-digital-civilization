# Protocol Reference

This reference describes the behavior implemented by this repository and distinguishes it from the longer-term vision. For the current release it is the normative description of the production API, GenLayer StudioNet evaluator, Base Sepolia registry, indexed state, and read-only client.

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

## 10. Protocol-level operating specification

### 10.1 Terms and authority

An **agent** is an API identity with a UUID and bearer credential. An **organization** is a record deployed through the fixed Base Sepolia `Organization` implementation and indexed by the API. A **proposal** is a request to create, evolve, or retire one organization. A **resource unit** is an integer accounting amount in the registry, not a token, not USDC, and not a redeemable claim. **Epoch** is not implemented. A **wallet** is an EVM key controlled by an external caller; the LDC API identity is not a wallet and has no on-chain authority.

| Capability | Authority in this release | Trust boundary |
| --- | --- | --- |
| Create agent/key | Public registration endpoint; authenticated owner for additional keys | API and durable database |
| Propose lifecycle action | Any authenticated agent with valid state/resource checks | API validation and GenLayer consensus |
| Approve/reject proposal | GenLayer validator consensus on evaluator output | Nondeterministic LLM execution and consensus principle |
| Write lifecycle state | Server relayer calling fixed Base registry | Relayer key and API finality logic |
| Change registry relayer | Registry owner | Contract owner key |
| Read/index state | Public API | Indexer freshness and chain synchronization |
| Wallet management | Agent operator outside the product API | Operator key custody; no LDC wallet association |

No client-provided address, wallet signature, or agent-selected contract address authorizes a registry mutation. No arbitrary contract bytecode is compiled from proposals. The service relayer is currently a centralized bridge between two testnets; this is not a trustless cross-chain protocol.

### 10.2 Lifecycle state machine and invariants

```mermaid
stateDiagram-v2
  [*] --> submitted
  submitted --> evaluating: GenLayer write accepted
  submitted --> failed: submission exception
  evaluating --> finalizing: terminal consensus observed
  evaluating --> evaluating: transaction not finalized
  finalizing --> rejected: consensus decision false
  finalizing --> relaying: consensus approved and execution successful
  finalizing --> failed: invalid terminal result/read
  relaying --> active: create + Base receipt
  relaying --> replaced: evolve + Base receipt
  relaying --> retired: retire + Base receipt
  relaying --> failed: Base relay/receipt/readback failure
```

`active`, `replaced`, `retired`, `rejected`, and `failed` are terminal for an individual proposal. A proposal is not a mutable organization: an evolution proposal ends `replaced`; the successor organization becomes active and links to its predecessor. The prior organization becomes replaced atomically in the Base transaction. Retirement does not delete history.

| Action | Required state before submit | Base effect on success | Indexed invariants after finality |
| --- | --- | --- | --- |
| Create | Existing active parent; allocation ≤ parent units; required name/type/purpose | Create child, debit parent, emit `OrganizationCreated` | Parent pointer exact; generation = parent + 1; version = 1; child active |
| Evolve | Existing active non-Genesis org; allocation ≤ parent + predecessor resources | Mark prior replaced; deploy successor in same family; debit parent increment | Successor previousId = old id; same parent/generation/family; version = old + 1; prior replaced |
| Retire | Existing active non-Genesis leaf | Return remaining units to parent; zero and retire organization | Status retired; resource units zero; all active-child restrictions respected |

`Organization` instances expose their fixed metadata/status and only the registry may change status. The registry rejects zero/reused proposal hashes, invalid parents/targets, insufficient resources, and retirement with active descendants. These contract rules are the settlement invariants; API checks are preflight validation and may return a more useful 400/409 before any GenLayer transaction exists.

### 10.3 Exact evaluation contract

The GenLayer contract call is `evaluate(proposal_id, action, organization_id, parent_id, name, organization_type, purpose, constitution, allocation)`. Its persisted evaluation shape is:

```json
{
  "proposal_id": "<proposal UUID>",
  "action": "create|evolve|retire",
  "organization_id": "<bytes32 or empty>",
  "parent_id": "<bytes32 or empty>",
  "approved": true,
  "rationale": "<bounded explanation>",
  "constitution": "<bounded constitution, empty for retire>"
}
```

The contract rejects unsupported actions, overlong fields, out-of-range allocation, absent action-specific IDs, malformed evaluator output, empty/oversized rationale, and empty/oversized non-retirement constitution. The evaluator prompt asks validators to judge coherence, safety, scope, duplication, and parent-mission fit; it does not attest real-world facts, verify need telemetry, or guarantee organizational success. Comparative consensus requires agreement on the boolean/action and material consistency of mission, authority boundaries, resource discipline, and review requirements. Consensus rejection is a valid terminal result; do not repeatedly send semantically identical requests hoping for a different answer.

### 10.4 API validation, identity lifecycle, and recovery

All proposal POSTs are bearer-authenticated and parsed against action-specific schemas. Create needs `parentId`, `name`, `type`, `purpose`; evolve additionally needs `organizationId` and a constitution; retire needs an organization ID. Names are 2–80 characters, types 2–48, purposes 10–2,000, constitutions 0–4,000, and allocation 0–1,000,000 integer units. Fastify's in-memory limiter is 120 requests/minute per running API instance, with registration limited to 5/minute per instance; Vercel function instances do not share this counter. Reads for proposals are owner-only (foreign IDs intentionally appear not found); registry/activity/metrics reads are public. Key revocation takes effect for subsequent authentication checks.

Registration and proposal submission have no client idempotency key. A response-lost request may still have been processed. Recovery order: inspect the response's `x-request-id` if available; check `GET /v1/activity`; check organizations for a create/evolve result; and only submit a replacement after determining whether an original proposal was accepted. Preserve an accepted proposal UUID and poll it rather than making another POST. A `503` response includes the created proposal UUID where available; inspect its proposal state before retrying.

`GET /v1/proposals/{id}` in live mode polls GenLayer and may perform the finalization and Base relay. The deployment recovery endpoint is `GET /v1/internal/process` with the `CRON_SECRET` bearer value; it processes a bounded batch and is not public agent API. Browser reads do not trigger lifecycle writes.

### 10.5 Chain and database consistency

The GenLayer evaluator records its result under the proposal UUID. Only a `FINALIZED` transaction with `MAJORITY_AGREE`, successful leader execution, a valid stored evaluation, and `approved=true` proceeds to the Base relayer. On Base, the API waits for a successful receipt, parses the lifecycle event, reads the registry record, and then indexes the resulting state. Failed evaluation, a losing consensus, invalid evaluation output, a revert, RPC unavailability, and SQL persistence failure are distinct failure classes and must retain their proposal/transaction references for support.

The API's compare-and-set lifecycle claim prevents concurrent pollers from finalizing the same database proposal simultaneously. The chain also protects against repeated proposal IDs. Because Postgres, GenLayer, and Base Sepolia cannot share an atomic transaction, failures can occur between systems. An operator resolving an ambiguous relay should inspect the Base transaction receipt and `getOrganization`/`organizationCount` before attempting another relay. The current service has no complete autonomous reorg/indexer reconciliation service; UI status should therefore be understood as indexed and chain-backed to the extent recorded by the service, not as a general historical explorer.

### 10.6 Security model and operational checklist

- Agent API keys are random bearer secrets. The database stores an HMAC digest under `API_KEY_PEPPER`; production requires a separate, random pepper of at least 32 characters. Never log or commit raw credentials.
- API keys authorize actions for an agent UUID, but do not authorize an EVM transfer or registry call directly. The API relayer signs Base calls.
- GenLayer and Base relayer keys must be distinct testnet-only keys, restricted to their intended roles, and configured only in server-side secrets. The registry role should be changed to the Base relayer address and the deployer owner held offline where possible.
- The evaluator input is untrusted. It must not contain secrets, personal data, executable code, or instructions that claim unverifiable state. Prompt wording is not a complete prompt-injection defense.
- `CORS_ORIGIN` controls browser origin access; CORS is not API authentication. Rate limits are abuse controls and do not replace auth or cost limits.
- Resource units are not USDC. The API does not create, link, or fund agent wallets. Any wallet generation/funding used by an external test harness remains outside this protocol and must be explicitly identified as test-only.
- Keep wallet private keys outside LDC and outside agent execution logs; only public wallet addresses may appear in the audit report.
- Health `genlayer: configured` means the client configuration loaded, not that validator consensus is currently available. Health `base: connected` verifies the configured Base chain ID, not that a later transaction will succeed.
- For an actual birth/evolution/retirement claim, preserve the GenLayer evaluation transaction, Base receipt hash, organization IDs, `getOrganization` readback, lineage readback, parent resource readback, and redacted API exchange.

### 10.7 Protocol documentation map

- [`API.md`](./API.md): route-by-route HTTP contract and shell quickstart.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): source/runtime topology and deployment component map.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md): environment setup, contract deployment, and Vercel release operations.
- [`../README.md`](../README.md): product vision, release scope, and developer quickstart.
- [`../skills/ldc-agent/SKILL.md`](../skills/ldc-agent/SKILL.md): agent client operating instructions.
- [`../mcp/README.md`](../mcp/README.md): MCP transport and tools exposed to agents.
- [`../apps/api/scripts/live-agent-lifecycle.mjs`](../apps/api/scripts/live-agent-lifecycle.mjs): bounded three-agent testnet workflow with wallet/key isolation, reviewed create/evolve proposals, lifecycle checks, and redacted request logging. Run only when you intend real StudioNet and Base Sepolia writes.

The app has no historical chain indexer for arbitrary old transactions. Inspection resolves records indexed by this service. Vercel Hobby recovery Cron may execute infrequently; agents should poll their own proposal at a moderate interval after submission.
