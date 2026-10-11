# Gates: Living Digital Civilization complete build and testnet launch

Scope: deliver an agent API, independently living organizations, a read-only observatory, verified testnet contracts, and published GitHub/Vercel artifacts.

- [x] G0: this ledger contains executable, outcome-specific acceptance checks
  CHECK: node /home/sudodave/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8cf2a8ca706339a76b5da0eea4f205881e5092cfc7b768115104c8c19a06b2fd; exit=0; EXPECT=matched; output-sha256=1f53c72d2fddaf96495c27ef0a6347831e1602a62c6c438957c6329a77ef0862; output-bytes=504; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G1: API and web workspaces build from the locked dependency graph
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=04f9498ac4f29fed5dcf8221210fee1d554cb88d7c67c39ba6d82c9c706a06b8; output-bytes=657; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G2: API lifecycle behavior, agent keys, and authorization are exercised by automated tests
  CHECK: pnpm test
  EXPECT: agent can receive a one-time key, submit a child DAO, and inspect its completed lineage
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a82885c93e5e2cd1ef26f6d72723499e25ba391156801f1664f8e93c7b01f91; exit=0; EXPECT=matched; output-sha256=97eba501f82661ebe6a8dfca0819726dc434c61ee2dfbd92cea072cfe2ebecd7; output-bytes=1037; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G3: Base registry enforces creation, evolution, retirement, lineage, resource accounting, and role boundaries in tests
  CHECK: forge test --root contracts/base
  EXPECT: 4 tests passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8734663d630383c64cc1d566560d2736200f5802746703c0a58ae5b0cbf10ee8; exit=0; EXPECT=matched; output-sha256=e055ec55bc4b8d8722ab32bd3a09cd7ea182a6e7d9f537a56c0a1748255e8e12; output-bytes=599; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G4: GenLayer evaluator passes the available GenVM source lint checks
  CHECK: genvm-lint lint contracts/genlayer/institutional_evaluator.py
  EXPECT: Lint passed (3 checks)
  EVIDENCE: automatic-evidence=v1; definition-sha256=d50c623347ad79bf4fc029bd9f5d8ba518a440900aee7b04037ed4448e6457ca; exit=0; EXPECT=matched; output-sha256=fff164bc9db8bc961b50ccc61f00bbaa6a4ad185bc531e4e9e4559efb933cacb; output-bytes=27; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [ ] G5: public testnet deployment records verified contract addresses and successfully exercised lifecycle transactions
  EVIDENCE: pending

- [ ] G6: GitHub repository contains complete source history and no build secrets
  EVIDENCE: pending

- [ ] G7: deployed Vercel observatory reads the configured production backend and renders live registry/activity state
  EVIDENCE: pending

- [x] G8: agent integration guide enables API key issuance and proposal lifecycle without UI write controls
  EVIDENCE: `docs/API.md` documents key issuance, authenticated proposal submission, polling, and read endpoints; the automated API lifecycle test covers the same flow. `apps/web/src/App.tsx` contains monitoring/selection controls only and submits no lifecycle mutations.
