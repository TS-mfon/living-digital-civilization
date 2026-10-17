# Testnet deployment

## Base Sepolia

From the repository root, deploy using the key in `/home/sudodave/.env.build`:

```sh
forge build --root contracts/base
./scripts/deploy-base.sh
```

The deployer becomes registry owner and initial relayer. Record the printed registry address and use the same dedicated testnet key as `BASE_RELAYER_PRIVATE_KEY` in the API. The helper reads only `PRIVATE_KEY` from `LDC_BUILD_ENV` (default `/home/sudodave/.env.build`) and signs locally. It submits to `https://base-sepolia-rpc.publicnode.com` by default; override `BASE_RPC_URL` when another provider is available. `BASE_RPC_IP` can pin a resolved endpoint IP when local DNS is unavailable.

Run the public testnet lifecycle check with `./scripts/deploy-base.sh smoke`; it creates a child, evolves it, retires the successor, then verifies lineage and resource return against the deployed registry.

## GenLayer StudioNet

Select the built-in network, inspect it, then deploy:

```sh
genlayer network info
./scripts/deploy-genlayer.sh
```

The helper selects `studionet`, uses the locally encrypted `ldc-studionet-deployer` CLI account, and checks the receipt for successful execution. It does not read or print `.env.build`. Record the contract address only after the receipt reports successful execution. Set `GENLAYER_EVALUATOR_ADDRESS` and `GENLAYER_RELAYER_PRIVATE_KEY` in the API runtime.

The API pins `genlayer-js` to `1.1.8` because StudioNet uses the five-argument `addTransaction(address,address,uint256,uint256,bytes)` consensus ABI. The `2.0.0-rc.1` fee envelope was accepted as a transaction but finalized without validator participation or evaluator execution. Before upgrading the SDK, run `test/genlayer-transport.test.ts` and verify a real finalized evaluation with successful execution. A finalized transaction alone does not authorize a Base relay.

## Vercel frontend and API

The repository root is the Vercel project root. `vercel.json` builds the read-only Vite observatory, routes `/v1/*` and `/health` to the Fastify Function, and rewrites browser routes to the SPA entry point. The checked-in recovery cron expression is `0 0 * * *` (once daily); agents should poll their proposals after submission. Local mode uses SQLite. Vercel refuses to start the API without `DATABASE_URL`; connect a Neon Postgres resource before deploying. The first API startup creates the required tables and the Genesis record.

Set these Vercel environment variables for production and preview as needed:

- `DATABASE_URL`: Neon connection URL provided by the Vercel integration.
- `API_KEY_PEPPER`: random secret with at least 32 characters.
- `CRON_SECRET`: separate random secret for the Vercel Cron request.
- `DEMO_MODE`: `true` for a simulated launch; use `false` only after both testnet contracts are deployed and the other environment values are set.
- `BASE_RPC_URL`, `BASE_REGISTRY_ADDRESS`, `BASE_RELAYER_PRIVATE_KEY`, `GENLAYER_EVALUATOR_ADDRESS`, `GENLAYER_RELAYER_PRIVATE_KEY`, `GENLAYER_NETWORK=studionet`: testnet/StudioNet connection values. Keep signer keys in server environment variables only.

Deploy with `vercel --prod` from the repository root. Then verify `/health`, agent registration, proposal creation, cron completion, and dashboard updates. The free Neon integration install requires marketplace terms acceptance in the Vercel account.

The deployment build runs the workspace builds, type-checks the Vercel handlers and API tests, and runs the API/simulation, MCP, and documentation checks before publishing. API tests explicitly use temporary SQLite databases even when deployment database variables are present; they must never mutate the production database. GitHub CI also runs the Base contract tests. After a release, run `node scripts/verify-deployment.mjs` to verify public page routes, JSON read endpoints, and an actual SSE connection frame. Override `LDC_ORIGIN` to check a different deployment.

## Go-live checklist

- Verify Base chain ID is 84532 and the GenLayer CLI reports StudioNet (chain ID 61999).
- Verify deployment addresses from receipts; never rely only on a submitted hash.
- Confirm API environment values are private and point to testnet deployments.
- Keep `DEMO_MODE=false` only when both adapters are configured.
- Confirm operator funds and rate limits; rotate any test keys that were exposed.
