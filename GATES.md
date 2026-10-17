# Gates: Living Digital Civilization complete build and testnet launch

Scope: deliver an agent API, independently living organizations, a read-only observatory, verified testnet contracts, and published GitHub/Vercel artifacts.

- [x] G0: this ledger contains executable, outcome-specific acceptance checks
  CHECK: node /home/sudodave/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8cf2a8ca706339a76b5da0eea4f205881e5092cfc7b768115104c8c19a06b2fd; exit=0; EXPECT=matched; output-sha256=0b1588cd442332e9ec9fc3e69860a46c1f0a9995e7a9053e2d5c84dce15cac99; output-bytes=1099; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G1: API and web workspaces build from the locked dependency graph
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=e8ba251d497fa69bf7336d096f38cf4e8b22e14d0598f2a1d7454bf6bb614440; output-bytes=715; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G2: API lifecycle behavior, agent keys, and authorization are exercised by automated tests
  CHECK: pnpm test
  EXPECT: agent can receive a one-time key, submit a child DAO, and inspect its completed lineage
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a82885c93e5e2cd1ef26f6d72723499e25ba391156801f1664f8e93c7b01f91; exit=0; EXPECT=matched; output-sha256=627d841a478de15b16d35fbf8aa41ff536c23d4f510417f7ac500e84f0b26476; output-bytes=2145; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G3: Base registry enforces creation, evolution, retirement, lineage, resource accounting, and role boundaries in tests
  CHECK: forge test --root contracts/base
  EXPECT: 4 tests passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8734663d630383c64cc1d566560d2736200f5802746703c0a58ae5b0cbf10ee8; exit=0; EXPECT=matched; output-sha256=b0b3fd5da70ee1a4aac29300ec0456f360729ef0c7bc6bff2458e7af4f0893da; output-bytes=599; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G4: GenLayer evaluator passes the available GenVM source lint checks
  CHECK: genvm-lint lint contracts/genlayer/institutional_evaluator.py
  EXPECT: Lint passed (3 checks)
  EVIDENCE: automatic-evidence=v1; definition-sha256=d50c623347ad79bf4fc029bd9f5d8ba518a440900aee7b04037ed4448e6457ca; exit=0; EXPECT=matched; output-sha256=fff164bc9db8bc961b50ccc61f00bbaa6a4ad185bc531e4e9e4559efb933cacb; output-bytes=27; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G5: public testnet deployment records verified contract addresses and successfully exercised lifecycle transactions
  EVIDENCE: GenLayer StudioNet (chain 61999) evaluator `0x4601Ad453da13B11d240b4943f9BB026108C9Ce4`, deploy tx `0x012142f072af7b013eae4b47fd8be930083fdfc6c8685fece450007905317ccb`; evaluation tx `0x528be863eff951157f4db87391e02a459565a977192bd8339da1092c20afd501` finalized `MAJORITY_AGREE`, leader execution `SUCCESS`, and `get_evaluation_count=1`. Base Sepolia registry `0x8907e46d9cc22d2ea953c3b83ab082cabf7c823f`, deploy tx `0x5ccd155fea321a3c5500037e84858fd3a07f778487d5343b454a240e0ffbc013`; lifecycle create `0x9bb1deb5c62a90ab3839ec55e983d6692c638eebf070fa39fd82ef43dea67429`, evolve `0xc368abaabf89edf5f186f32c5f604083509a3fccef4d72274b341e34f3ab1830`, retire `0xda1dd013459e247336de457ea5cff0bbcbeca2ba2f7d4427d9ee9b018ea161c8`. Readback verified replacement lineage, retired status, and resource return to Genesis.

- [x] G6: GitHub repository contains complete source history and no build secrets
  EVIDENCE: private repository https://github.com/TS-mfon/living-digital-civilization; complete source history has been pushed; `.env.build` is ignored and absent from tracked files.

- [x] G7: deployed Vercel observatory reads the configured production backend and renders live registry/activity state
  EVIDENCE: Production `https://living-digital-civilization.vercel.app`, ready deployment `dpl_7JCZYd9nWUEdkLETQf7dauUq59ga`. Sensitive API key pepper, cron secret, Base relayer key, and GenLayer relayer key are configured; `DEMO_MODE=false`, StudioNet and Base Sepolia endpoints are configured; Neon Postgres is connected. Production `/health` returned `{ok:true,mode:testnet,base:connected,genlayer:configured}`; `/v1/organizations` returned the seeded Genesis record with `demo:false`; `/v1/activity` returned a live Postgres-backed response. Deployment protection was disabled so the requested read-only observatory is publicly reachable.

- [x] G8: agent integration guide enables API key issuance and proposal lifecycle without UI write controls
  EVIDENCE: `docs/API.md` documents key issuance, authenticated proposal submission, polling, and read endpoints; the automated API lifecycle test covers the same flow. `apps/web/src/App.tsx` contains monitoring/selection controls only and submits no lifecycle mutations.

- [x] G9: API report findings have route coverage and query-bound validation
  CHECK: pnpm --filter @ldc/api test
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=6be15c39fea7028f1418187bcf170c51ff27a3a9b6638fa65a379c86f1cafdba; exit=0; EXPECT=matched; output-sha256=7a0861217a0efaa9ab277bbd6fce0b6a6508f331aa0faa264e779e1cc2ea575e; output-bytes=1472; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G10: civilization observatory and API compile for production
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=3c9bd3a2377287a8ae7aadac468a9c25832cdc92a281620d811c6461f1c3273b; output-bytes=715; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G11: MCP tool server is valid JavaScript and protocol docs match the implemented API
  CHECK: pnpm mcp:test
  EXPECT: MCP initialize, tool discovery, and argument validation passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=dbcf25a4e211423507530a57fdbc0a494e8bd928a600e91b6290c5d353492fa8; exit=0; EXPECT=matched; output-sha256=3270b895baefe3e438a87ab5e5ee87f1525cb5518cda109f59716ed38012ce16; output-bytes=84; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G12: updated GitHub commit and Vercel production deployment are recorded
  EVIDENCE: Commit `3d72f1d0dc689511aa0f0f84fe65d4c33ff78037` was pushed to `origin/main`. Vercel production deployment `dpl_AsA5LKbfwvAfFWekgGKoUUYmVkwD` is READY and aliased to `https://living-digital-civilization.vercel.app`. Live smoke checks returned `/v1/health` 200 with testnet adapters connected, `/v1/organizations` 200, `/v1/metrics` 200, invalid activity limit 400, and SPA `/monitor`, `/inspect`, and `/docs` routes 200.

- [x] G13: protocol documentation explains the implemented system end to end and makes unsupported features explicit
  CHECK: node scripts/check-protocol-docs.mjs
  EXPECT: PROTOCOL DOCS PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=0c5b045c737d63f4d58350f83a7d6f4cdae10c4cf74000cf7a22a13f2c5eb6c8; exit=0; EXPECT=matched; output-sha256=56c6b0cbd6ba190a42682763318a534e7da71508afd47661dce0a146b702bd66; output-bytes=19; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [ ] G14: independent live agent identities with dedicated wallets execute organization birth and an evolution to terminal finality on StudioNet and Base Sepolia
  EVIDENCE: Add production request trace, wallet addresses only, agent IDs, proposal IDs, final proposal statuses, and Base transaction hashes after the run. Never include API keys or private keys.
  REOPENED: October 15, 2026. Investigate SDK/StudioNet submission compatibility before attributing missing validator participation to an external outage. Preserve consensus checks and verify a genuine create/evolve/retire lifecycle.

- [x] G15: production run report includes every request and response while redacting credentials and signing secrets
  CHECK: node scripts/check-live-report.mjs reports/ldc_agent_execution.jsonl reports/ldc_agent_runner_transport.jsonl
  EXPECT: LIVE REPORT PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=1ab7735284fa88775285b3058553a55e9388c292068bfe8ccfeade8a7751ef7b; exit=0; EXPECT=matched; output-sha256=343f997d75163a124e824a7e7dfa4dda46818c2831ac6b2ab910942ddf47cc9e; output-bytes=17; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G16: completed changes are committed, pushed to GitHub main, and deployed to Vercel production
  EVIDENCE: Commit `af5caf84a64b05aafcdc311783b27c077e24e9e3` (including protocol docs, agent runner, and execution report) is pushed to `origin/main`. Vercel production deployment `dpl_J3jWtzQFiupKo9fESnZR9oA83PBA` is READY and aliased to `https://living-digital-civilization.vercel.app`. `/v1/health` and `/v1/organizations` returned HTTP 200 with testnet adapters connected and Genesis active; `/docs`, `/monitor`, `/inspect`, and `/archive` returned HTTP 200.

- [x] G17: multi-agent live runner parses and documents safe wallet/key isolation and bounded lifecycle retries
  CHECK: node scripts/check-live-runner.mjs
  EXPECT: LIVE RUNNER SYNTAX PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=721ae4d7c6b4df5a3c424300fffb26785898994a19f5b3a5c496043f109a5e8e; exit=0; EXPECT=matched; output-sha256=6430811b0238f5294ea2c725c1ff17a8d09e30222e0319ba95b6c8ce2d15de24; output-bytes=24; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G18: public web observatory presents institutional birth, growth, evolution, lineage and read-model limitations clearly
  CHECK: pnpm --filter @ldc/web build
  EXPECT: vite build
  EVIDENCE: automatic-evidence=v1; definition-sha256=6027896e89a3d318574c19f51e50fc382b7904196b14c4eb81fad6571f554a3f; exit=0; EXPECT=matched; output-sha256=b4e7762972ec2b874694e3f9c5c9794b14ce6b37960d20b2ced5b5e2a246b950; output-bytes=372; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G19: Need Detection, DNA boundaries, lineage traversal, lifecycle, social graph, governance and skills have deterministic tested protocol primitives
  CHECK: pnpm --filter @ldc/api test:sim
  EXPECT: simulation: 100 epochs × 10 agents
  EVIDENCE: automatic-evidence=v1; definition-sha256=e509a53629d76cbbf8d765372b25cbd0ec309521074329bb895575945b0a65f1; exit=0; EXPECT=matched; output-sha256=e9817dc74f7b30034309980f6a9757fb767e9a3619d0bd6f3e5b3d416293ea50; output-bytes=350; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G20: protocol-level documentation describes available primitives, trust boundaries, API operations, keys, wallet custody and deployment
  CHECK: node scripts/check-protocol-docs.mjs
  EXPECT: PROTOCOL DOCS PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=0c5b045c737d63f4d58350f83a7d6f4cdae10c4cf74000cf7a22a13f2c5eb6c8; exit=0; EXPECT=matched; output-sha256=56c6b0cbd6ba190a42682763318a534e7da71508afd47661dce0a146b702bd66; output-bytes=19; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G21: CI validates API/web compilation, API tests, contract tests and GenLayer source lint
  CHECK: node scripts/check-ci-workflow.mjs
  EXPECT: CI WORKFLOW PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=f61ee0fc65d56d77adff7eef859f7969496017b7e76e4ee0df96ff5cd93c4ffc; exit=0; EXPECT=matched; output-sha256=1786bd0833e87a95c179d239e8b9f172fb35c97e43b8dbf5a45e9c77443aa0f1; output-bytes=17; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G22: the revised release is pushed to GitHub and its frontend production deployment is ready with smoke-checked routes
  EVIDENCE: Commit `9432bec` is pushed to `origin/main`. Vercel deployment `dpl_7eRkNCn2oxBFxvUrLPRyvndMHJAp` is READY and aliased to `https://living-digital-civilization.vercel.app`. Production smoke requests returned HTTP 200 for `/`, `/monitor`, `/inspect`, `/docs`, `/archive`, `/v1/health`, and `/v1/metrics`.

## Recovery on October 15, 2026

Recovered session: `01a12ab8-9211-7911-8a91-6be81e674674`. Historical evidence above describes earlier releases, not verification of the recovered changes. Resume the unfinished streaming fix, rerun regressions, retry the bounded live testnet lifecycle, and record the actual release and remaining protocol boundaries without presenting simulation modules as deployed autonomous functionality.

- [x] G23: real HTTP streams remain open after the request completes, deliver events, preserve CORS/rate limits, and clean up on disconnect
  CHECK: pnpm --filter @ldc/api exec node --import tsx --test test/vercel-stream.test.ts
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=d7d667fb3464e2ec491a18b8c51753fd85e8915a68046c3a62bd4d69016bc716; exit=0; EXPECT=matched; output-sha256=430e19d9364408c2009e82e687db03419ff5ff6f917eb7b8d5a93b5a37181e06; output-bytes=520; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G24: the recovered API, simulation, Base contracts, frontend, MCP, docs, and runner pass regression checks
  CHECK: pnpm build && pnpm test && pnpm mcp:test && node scripts/check-protocol-docs.mjs && node scripts/check-live-runner.mjs
  EXPECT: LIVE RUNNER SYNTAX PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=fb7a411f9130a6d74221e35b52328b1be4a5c53d6e44ddd555a7423b6f57c42d; exit=0; EXPECT=matched; output-sha256=7ed13a10e9ed0b4ea55623fd1a83460489c64e82941c35087e8240d4efe1d07c; output-bytes=2988; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G25: the recovered deployment returns streaming SSE frames and healthy public application routes
  CHECK: node scripts/verify-deployment.mjs
  EXPECT: DEPLOYMENT SMOKE PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=2e8bad57d2cd8f01a22671bebf0aa8e2ce86a6376800da3819dc7e802fe5bd9a; exit=0; EXPECT=matched; output-sha256=0622541bb132cbf587e48071dfba19ab469120f7f12e259d8a73ca0aec9f4765; output-bytes=245; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=e31aa2574bf9/55 entries

- [x] G26: the recovery report distinguishes verified implementation, live testnet outcomes, and outstanding original-spec features
  EVIDENCE: reports/recovery-2026-10-15.md records the recovered session, source changes, live IDs/receipt, request counts, test evidence and deployment. docs/COMPLETION-STATUS.md audits every requested feature area against implementation and explicitly lists simulation-only and missing capabilities. No claim of full original-spec completion is made. Credentials are outside the repository; no consensus checks were weakened.
