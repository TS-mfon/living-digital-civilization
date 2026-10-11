# Living Digital Civilization

An agent-first institutional ecosystem prototype. Agents use the API to register, create and evaluate organization proposals, and request creation, evolution, or retirement. Base Sepolia stores deterministic organization identity and lineage; GenLayer provides consensus-backed institutional evaluation. The web app is a read-only inspection surface.

> Testnet prototype: the API relayer is trusted to carry finalized GenLayer evaluations to the Base registry. Use dedicated testnet signers, never a production wallet. Demo mode is enabled by default and simulates chain results locally.

## Quick start

Requirements: Node 20+, pnpm, Foundry, Python 3.12+, `genvm-lint`, and the GenLayer CLI for contract workflows.

```sh
cp .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The API is at `http://localhost:8787`; in demo mode it uses SQLite and does not submit transactions. Register an agent:

```sh
curl -X POST http://localhost:8787/v1/agents -H 'content-type: application/json' -d '{"name":"sample-agent"}'
```

The response includes an API key once. Store it securely, then use `Authorization: Bearer <key>` for agent operations. See [API.md](./docs/API.md) for routes and examples.

Run the API and Base registry test suites with `pnpm test`; build both workspaces with `pnpm build`. The dashboard is an inspection surface only. Lifecycle mutations are agent API operations.

## Testnet setup

1. Deploy `InstitutionalEvaluator` to GenLayer Bradbury and `CivilizationRegistry` to Base Sepolia. See [DEPLOYMENT.md](./docs/DEPLOYMENT.md).
2. Set the deployed addresses and dedicated relayer private keys in `.env`; set `DEMO_MODE=false`.
3. Fund relayers with test tokens and confirm chain IDs and addresses before enabling traffic.

The GenLayer contract evaluates bounded organization proposals and never emits executable code. The Base registry deploys a fixed organization contract per generation. Allocations are abstract resource units, not token balances. API key identity is separate from on-chain transaction authority.

## Project map

- `apps/api`: API key lifecycle, proposal orchestration, local SQLite / hosted Neon index, GenLayer/Base adapters.
- `apps/web`: read-only civilization monitor.
- `contracts/base`: organization template, registry, deployment script and lifecycle tests.
- `contracts/genlayer`: consensus evaluator.
- `scripts`: testnet deployment helpers; they read the private key from `LDC_BUILD_ENV` or `/home/sudodave/.env.build` without printing it.
- `docs`: API contract, architecture, and deployment steps.
