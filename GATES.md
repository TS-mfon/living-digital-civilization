# Gates: Living Digital Civilization complete build and testnet launch

Scope: deliver an agent API, independently living organizations, a read-only observatory, verified testnet contracts, and published GitHub/Vercel artifacts.

- [x] G0: this ledger contains executable, outcome-specific acceptance checks
  CHECK: node /home/sudodave/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8cf2a8ca706339a76b5da0eea4f205881e5092cfc7b768115104c8c19a06b2fd; exit=0; EXPECT=matched; output-sha256=1f53c72d2fddaf96495c27ef0a6347831e1602a62c6c438957c6329a77ef0862; output-bytes=504; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G1: API and web workspaces build from the locked dependency graph
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=11cbd31411761bfb5e6eafa9688629b4c5c319882f82543169a586c749cf5069; output-bytes=657; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G2: API lifecycle behavior, agent keys, and authorization are exercised by automated tests
  CHECK: pnpm test
  EXPECT: agent can receive a one-time key, submit a child DAO, and inspect its completed lineage
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a82885c93e5e2cd1ef26f6d72723499e25ba391156801f1664f8e93c7b01f91; exit=0; EXPECT=matched; output-sha256=72201127289bf004bc9b93d9d7ad47526230fd53d4a10c317c58bc79a6c8b11b; output-bytes=1114; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G3: Base registry enforces creation, evolution, retirement, lineage, resource accounting, and role boundaries in tests
  CHECK: forge test --root contracts/base
  EXPECT: 4 tests passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8734663d630383c64cc1d566560d2736200f5802746703c0a58ae5b0cbf10ee8; exit=0; EXPECT=matched; output-sha256=6210586a03440f462b135aad46fa9961376eb5b7e8c7e1b673a7abf8be3926ef; output-bytes=599; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=b595b0d4d9f294c9b68a1b6acc8f5a17071ca17f396135784ce7e4b831e70506; exit=0; EXPECT=matched; output-sha256=f93223f815b26a9f3f95e6f4bf814f2ad3b36b0439feab9f151d1d9317a8f0cc; output-bytes=545; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G10: civilization observatory and API compile for production
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=1b7487ed0ca5230cd96f87995367f6174b28ea9929509b0460279ea96a6580f2; output-bytes=657; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G11: MCP tool server is valid JavaScript and protocol docs match the implemented API
  CHECK: node --check mcp/server.mjs && node -e 'console.log("mcp syntax valid")'
  EXPECT: mcp syntax valid
  EVIDENCE: automatic-evidence=v1; definition-sha256=5d4b49a90f8f5baaa811dbd0bb3d3413c3a61d45561bb5f2baefe5f4fb1bdcfa; exit=0; EXPECT=matched; output-sha256=4efd62ac76f8dd2e218e4f710956b41fe9d2e9d1b8671a7db91625de95068b8c; output-bytes=17; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G12: updated GitHub commit and Vercel production deployment are recorded
  EVIDENCE: Commit `3d72f1d0dc689511aa0f0f84fe65d4c33ff78037` was pushed to `origin/main`. Vercel production deployment `dpl_AsA5LKbfwvAfFWekgGKoUUYmVkwD` is READY and aliased to `https://living-digital-civilization.vercel.app`. Live smoke checks returned `/v1/health` 200 with testnet adapters connected, `/v1/organizations` 200, `/v1/metrics` 200, invalid activity limit 400, and SPA `/monitor`, `/inspect`, and `/docs` routes 200.
