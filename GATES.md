# Gates: Living Digital Civilization complete build and testnet launch

Scope: deliver an agent API, independently living organizations, a read-only observatory, verified testnet contracts, and published GitHub/Vercel artifacts.

- [x] G0: this ledger contains executable, outcome-specific acceptance checks
  CHECK: node /home/sudodave/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8cf2a8ca706339a76b5da0eea4f205881e5092cfc7b768115104c8c19a06b2fd; exit=0; EXPECT=matched; output-sha256=7e1af4d85b057d8c33f8ff4062b9b6fca9bf0fd7e2a06634c77e83ae20da615a; output-bytes=742; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G1: API and web workspaces build from the locked dependency graph
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=c09463d42dfa8ccc324908ed1fbfbf202e1d8d6124c6fb9c246baa52b07a3116; output-bytes=657; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G2: API lifecycle behavior, agent keys, and authorization are exercised by automated tests
  CHECK: pnpm test
  EXPECT: agent can receive a one-time key, submit a child DAO, and inspect its completed lineage
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a82885c93e5e2cd1ef26f6d72723499e25ba391156801f1664f8e93c7b01f91; exit=0; EXPECT=matched; output-sha256=3cc85baad833c5abd7359db876c729cc3a9635608428f60a6821964cd7512a22; output-bytes=1211; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G3: Base registry enforces creation, evolution, retirement, lineage, resource accounting, and role boundaries in tests
  CHECK: forge test --root contracts/base
  EXPECT: 4 tests passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8734663d630383c64cc1d566560d2736200f5802746703c0a58ae5b0cbf10ee8; exit=0; EXPECT=matched; output-sha256=3f8e08d0a6e99b716d0a25e1558a5217d0b830137501a4ac0e53019275310266; output-bytes=599; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G4: GenLayer evaluator passes the available GenVM source lint checks
  CHECK: genvm-lint lint contracts/genlayer/institutional_evaluator.py
  EXPECT: Lint passed (3 checks)
  EVIDENCE: automatic-evidence=v1; definition-sha256=d50c623347ad79bf4fc029bd9f5d8ba518a440900aee7b04037ed4448e6457ca; exit=0; EXPECT=matched; output-sha256=fff164bc9db8bc961b50ccc61f00bbaa6a4ad185bc531e4e9e4559efb933cacb; output-bytes=27; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

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
  EXPECT: pass 4
  EVIDENCE: automatic-evidence=v1; definition-sha256=b595b0d4d9f294c9b68a1b6acc8f5a17071ca17f396135784ce7e4b831e70506; exit=0; EXPECT=matched; output-sha256=78cc7eabf7467a8587cfc04a3c6276fa926c4681273b93f7476d64de1526d40a; output-bytes=546; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G10: civilization observatory and API compile for production
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=a4faad38493c36ec0d7e0778b836a7392e166ee014fb41b32b5ed4ec50be5170; output-bytes=657; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G11: MCP tool server is valid JavaScript and protocol docs match the implemented API
  CHECK: pnpm mcp:test
  EXPECT: MCP initialize, tool discovery, and argument validation passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=dbcf25a4e211423507530a57fdbc0a494e8bd928a600e91b6290c5d353492fa8; exit=0; EXPECT=matched; output-sha256=3270b895baefe3e438a87ab5e5ee87f1525cb5518cda109f59716ed38012ce16; output-bytes=84; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G12: updated GitHub commit and Vercel production deployment are recorded
  EVIDENCE: Commit `3d72f1d0dc689511aa0f0f84fe65d4c33ff78037` was pushed to `origin/main`. Vercel production deployment `dpl_AsA5LKbfwvAfFWekgGKoUUYmVkwD` is READY and aliased to `https://living-digital-civilization.vercel.app`. Live smoke checks returned `/v1/health` 200 with testnet adapters connected, `/v1/organizations` 200, `/v1/metrics` 200, invalid activity limit 400, and SPA `/monitor`, `/inspect`, and `/docs` routes 200.

- [x] G13: protocol documentation explains the implemented system end to end and makes unsupported features explicit
  CHECK: node scripts/check-protocol-docs.mjs
  EXPECT: PROTOCOL DOCS PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=0c5b045c737d63f4d58350f83a7d6f4cdae10c4cf74000cf7a22a13f2c5eb6c8; exit=0; EXPECT=matched; output-sha256=56c6b0cbd6ba190a42682763318a534e7da71508afd47661dce0a146b702bd66; output-bytes=19; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [ ] G14: independent live agent identities with dedicated wallets execute organization birth and an evolution to terminal finality on StudioNet and Base Sepolia
  EVIDENCE: Add production request trace, wallet addresses only, agent IDs, proposal IDs, final proposal statuses, and Base transaction hashes after the run. Never include API keys or private keys.
ABANDON: G14 The current execution environment blocks the outbound sockets required for authenticated production writes (Vercel CLI curl reports Operation not permitted; native fetch fails before response). Handoff: run `pnpm --filter @ldc/api agents:live` from an outbound-network-enabled runner and attach its redacted output after create, evolution, and retirement reach finality.

- [x] G15: production run report includes every request and response while redacting credentials and signing secrets
  CHECK: node scripts/check-live-report.mjs reports/ldc_agent_execution.jsonl reports/ldc_agent_runner_transport.jsonl
  EXPECT: LIVE REPORT PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=1ab7735284fa88775285b3058553a55e9388c292068bfe8ccfeade8a7751ef7b; exit=0; EXPECT=matched; output-sha256=343f997d75163a124e824a7e7dfa4dda46818c2831ac6b2ab910942ddf47cc9e; output-bytes=17; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G16: completed changes are committed, pushed to GitHub main, and deployed to Vercel production
  EVIDENCE: Commit `39d79f80d2a5c5a440665e979f48bca8e05dea12` was pushed to `origin/main`. Vercel production deployment `dpl_6ipn2q2WPDRi68f44WYvfuagSxNd` is READY and aliased to `https://living-digital-civilization.vercel.app`. `/v1/health` and `/v1/organizations` returned HTTP 200 with testnet adapters connected and the active Genesis record; `/docs`, `/monitor`, `/inspect`, and `/archive` returned HTTP 200.

- [x] G17: multi-agent live runner parses and documents safe wallet/key isolation and bounded lifecycle retries
  CHECK: node scripts/check-live-runner.mjs
  EXPECT: LIVE RUNNER SYNTAX PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=721ae4d7c6b4df5a3c424300fffb26785898994a19f5b3a5c496043f109a5e8e; exit=0; EXPECT=matched; output-sha256=6430811b0238f5294ea2c725c1ff17a8d09e30222e0319ba95b6c8ce2d15de24; output-bytes=24; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries
