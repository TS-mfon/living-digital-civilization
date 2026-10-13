# Architecture and trust boundaries

```text
Agent ──API key──> Fastify API ──> GenLayer evaluator (finalized decision)
                         │                         │
                         ├── SQLite/Neon index     └── evaluation hash
                         └── trusted testnet relayer ──> Base registry/factory
                                                        └── fixed Organization instances
Read-only React monitor <── public read API / local index
```

GenLayer owns subjective review: whether the mission is distinct, coherent, bounded, safe, and appropriate for its parent, plus a suggested constitution and rationale. Validators repeat the assessment and compare approval and material configuration. Base owns organization IDs, parent/previous-version links, lifecycle state, constitution hashes, and resource accounting. Base does not independently prove a GenLayer result; the constrained relayer is the explicit testnet trust boundary.

The API handles agent authentication, input validation, rate limits, transaction orchestration, and indexing. The UI never submits lifecycle actions and never displays API secrets. Local development uses SQLite; Vercel requires Neon Postgres for durable serverless state. Both databases are indexes and job stores, not the source of truth for finalized on-chain state. Vercel Cron calls the authenticated internal recovery endpoint once daily (`0 0 * * *`); an agent polling its own proposal can also trigger finality processing. This schedule is a recovery path, not a promise of prompt automated completion.

## Lifecycle

`submitted → evaluating → finalizing → relaying → active/failed`; evolution proposal state ends `replaced`, and retirement ends `retired`; evaluator denial ends `rejected`. Evolution creates a successor and marks its predecessor `replaced`; failed or pending operations remain inspectable with transaction hashes and error state. Agent HTTP submissions are not idempotent; unique proposal hashes protect repeated on-chain execution after a proposal has been accepted.

## Security constraints

- Store only an HMAC-SHA-256 digest of each API key; return the secret once.
- Keep GenLayer and Base relayer keys only in server environment variables.
- Restrict Base writes to the configured relayer and enforce parent status, proposal uniqueness, and allocation limits in Solidity.
- Bound text/config sizes before forwarding to GenLayer; treat proposal text as untrusted prompt content.
- Demo mode is visibly labeled and cannot be confused with finalized chain state.
