# Gates: Living Digital Civilization complete build and testnet launch

Scope: deliver an agent API, independently living organizations, a read-only observatory, verified testnet contracts, and published GitHub/Vercel artifacts.

- [x] G0: this ledger contains executable, outcome-specific acceptance checks
  CHECK: node /home/sudodave/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8cf2a8ca706339a76b5da0eea4f205881e5092cfc7b768115104c8c19a06b2fd; exit=0; EXPECT=matched; output-sha256=1f53c72d2fddaf96495c27ef0a6347831e1602a62c6c438957c6329a77ef0862; output-bytes=504; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G1: API and web workspaces build from the locked dependency graph
  CHECK: pnpm build
  EXPECT: apps/api build: Done
  EVIDENCE: automatic-evidence=v1; definition-sha256=202d7c621f83497bd709d007ae40d4631b1748d002198ff5379733d0de8cd2ae; exit=0; EXPECT=matched; output-sha256=74e3a1241c4ccf0ada34a29898e2a5d8633af5039efcc6840871356a1af5d5d8; output-bytes=852; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G2: API lifecycle behavior, agent keys, and authorization are exercised by automated tests
  CHECK: pnpm test
  EXPECT: agent can receive a one-time key, submit a child DAO, and inspect its completed lineage
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a82885c93e5e2cd1ef26f6d72723499e25ba391156801f1664f8e93c7b01f91; exit=0; EXPECT=matched; output-sha256=2a029b1dacaa8436e461d4fced670657ebe4551b08ee89700b02af3da97040bb; output-bytes=1116; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G3: Base registry enforces creation, evolution, retirement, lineage, resource accounting, and role boundaries in tests
  CHECK: forge test --root contracts/base
  EXPECT: 4 tests passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8734663d630383c64cc1d566560d2736200f5802746703c0a58ae5b0cbf10ee8; exit=0; EXPECT=matched; output-sha256=f7d1884fac3028088ccb5292f605f0285a7cca2a06d8e40998eb773ec3f114bc; output-bytes=599; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [x] G4: GenLayer evaluator passes the available GenVM source lint checks
  CHECK: genvm-lint lint contracts/genlayer/institutional_evaluator.py
  EXPECT: Lint passed (3 checks)
  EVIDENCE: automatic-evidence=v1; definition-sha256=d50c623347ad79bf4fc029bd9f5d8ba518a440900aee7b04037ed4448e6457ca; exit=0; EXPECT=matched; output-sha256=fff164bc9db8bc961b50ccc61f00bbaa6a4ad185bc531e4e9e4559efb933cacb; output-bytes=27; shell=/bin/sh; cwd=/home/sudodave/living-digital-civilization; path=eb180fd1623a/54 entries

- [ ] G5: public testnet deployment records verified contract addresses and successfully exercised lifecycle transactions
  EVIDENCE: NOT MET. Bradbury deploy transaction `0xc69dc2f3c300581820bc9949b7a92bac3f624951a5ecf42a52a47f5a2211492f` reported `FINISHED_WITH_ERROR`; its candidate address is not usable. Base Sepolia deployment did not broadcast because `https://sepolia.base.org` DNS lookup failed. No testnet DAO/proposal is claimed as deployed.

- [x] G6: GitHub repository contains complete source history and no build secrets
  EVIDENCE: private repository https://github.com/TS-mfon/living-digital-civilization; complete source history has been pushed; `.env.build` is ignored and absent from tracked files.

- [ ] G7: deployed Vercel observatory reads the configured production backend and renders live registry/activity state
  EVIDENCE: NOT MET. `vercel build --yes --target preview` succeeds and emits the frontend plus API function, but production needs durable Neon/Postgres storage. Vercel Neon integration returned `action_required` pending acceptance of marketplace terms at https://vercel.com/gen-daves-projects/~/integrations/accept-terms/neon?source=cli; no deploy was made without durable database configuration.

- [x] G8: agent integration guide enables API key issuance and proposal lifecycle without UI write controls
  EVIDENCE: `docs/API.md` documents key issuance, authenticated proposal submission, polling, and read endpoints; the automated API lifecycle test covers the same flow. `apps/web/src/App.tsx` contains monitoring/selection controls only and submits no lifecycle mutations.
