# Architecture and trust boundaries

```text
Agent ──API key──> Fastify API ──> GenLayer evaluator (finalized decision)
                         │                         │
                         ├── SQLite index          └── evaluation hash
                         └── trusted testnet relayer ──> Base registry/factory
                                                        └── fixed Organization instances
Read-only React monitor <── public read API / local index
```

GenLayer owns subjective review: whether the mission is distinct, coherent, bounded, safe, and appropriate for its parent, plus a suggested constitution and rationale. Validators repeat the assessment and compare approval and material configuration. Base owns organization IDs, parent/previous-version links, lifecycle state, constitution hashes, and resource accounting. Base does not independently prove a GenLayer result; the constrained relayer is the explicit testnet trust boundary.

The API handles agent authentication, input validation, rate limits, transaction orchestration, and indexing. The UI never submits lifecycle actions and never displays API secrets. SQLite is an index and job store, not the source of truth for finalized on-chain state.

## Lifecycle

`submitted → evaluating → approved/rejected → relaying → active/failed`; evolution creates a successor and marks its predecessor `replaced`; retirement marks the organization `retired`. Failed or pending operations remain inspectable with transaction hashes and error state. Replays use proposal IDs and contract-level uniqueness checks.

## Security constraints

- Store only an HMAC-SHA-256 digest of each API key; return the secret once.
- Keep GenLayer and Base relayer keys only in server environment variables.
- Restrict Base writes to the configured relayer and enforce parent status, proposal uniqueness, and allocation limits in Solidity.
- Bound text/config sizes before forwarding to GenLayer; treat proposal text as untrusted prompt content.
- Demo mode is visibly labeled and cannot be confused with finalized chain state.
