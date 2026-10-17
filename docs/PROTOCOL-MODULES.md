# Protocol Modules: Deterministic Simulation Reference

This document describes the tested protocol library under `apps/api/src/protocol/`. These modules are pure application logic. They do not run as an autonomous service, persist production state, make GenLayer consensus calls, or authorize Base contract writes. The production write path remains the authenticated proposal API described in [API.md](./API.md) and [PROTOCOL.md](./PROTOCOL.md).

## Activity event stream

The Fastify API publishes indexed activity writes to a process-local Node `EventEmitter`; `GET /v1/stream` returns SSE messages named `civilization` plus heartbeat comments. The browser uses `EventSource`, which retries after connection loss, and closes its stream on unmount. The service removes listeners on response close, finish, or error, and disconnects slow consumers rather than buffering events without a bound. The Vercel adapter dispatches this GET through Fastify's native HTTP router instead of the buffered `inject()` adapter, preserving CORS and rate-limit hooks. `HEAD /v1/stream` returns 404 and does not open a stream. This provides low-latency same-instance updates, not guaranteed delivery or durable replay. Vercel may route subscribers and writes to different function instances, so production-wide reliable fan-out requires Redis or another shared pub/sub broker. The observatory's periodic HTTP polling remains authoritative when an event is missed.

## Lifecycle and epoch simulation

`tickAgent(agent, epoch, upkeep)` consumes non-negative energy upkeep, increments age and experience, clamps health, and emits an epoch event. An agent whose energy is exhausted loses health; reaching zero archives it and emits a memorial event. Archived agents do not change on future ticks. `seedOffspring` only accepts active parents at or above the configured legacy threshold and copies their trait values into a new active child with reset vitals.

The epoch integer is supplied by the simulation caller. There is no scheduler or chain epoch source in the deployed API. The current rule is a deterministic baseline for simulation, not a GenLayer consensus result.

## Social graph

`SocialGraph.interact(from,to,delta)` records a directed edge with trust, affinity, alignment in `[0,1]` and a non-negative cumulative transaction-volume counter. `alliesOf` ranks outgoing edges by combined affinity/trust/alignment; `adversariesOf` reverses that ranking. `factions(threshold)` treats qualifying directed links as undirected for connected-component clustering. The graph is in memory and is not persisted or exposed by production API endpoints.

## Governance ledger

`GovernanceLedger.open` accepts structured tax, zone, or ban policy proposals with an explicit epoch window. Each voter may vote once while the proposal is open. `finalize` must run at or after the closing epoch; it marks a proposal passed only when quorum is met and yes votes are a strict majority, then calls the supplied execution handler. Failed quorum/majority records a rejection. The caller owns voter eligibility, epoch progression, and execution safety; this library is not the live organization proposal mechanism and does not autonomously vote for agents.

## Need detection and factory boundary

`detectInstitutionalNeed` validates non-negative finite telemetry and emits either no recommendation or a heuristic, reviewable recommendation. Its type explicitly labels `source: heuristic` and `requiresGenLayerEvaluation: true`. It cannot deploy an organization. Live dispute rate, infrastructure capacity, and resource velocity are not currently fed into this function by the public service. A real deployment workflow must obtain/validate telemetry, submit its recommendation to GenLayer consensus, and pass the existing lifecycle validation before a factory/registry write.

## Immutable and living DNA

`ImmutableDNA` carries Genesis identity, parent pointer, generation, constitutional hash, and security rules as readonly fields. `LivingDNA` carries mutable governance parameters, allocation policy, operational rules, and a revision counter. `evolveLivingDNA` returns a new value and increments that counter. TypeScript `readonly` and value-copy conventions aid application correctness but do not provide storage immutability; on-chain guarantees require Solidity storage and access-control enforcement. The deployed registry stores parent/generation and the organization instance stores its constitution hash, but it does not yet persist this complete pair of DNA objects or Living DNA history.

## Lineage

`ancestryPath(id, parents)` produces the root-to-leaf path and detects cycles. On-chain registry lineage is authoritative for deployed organizations; the API `/v1/lineage/:id` is the indexed public view. For an on-chain read, verify each returned parent and generation against registry state and lifecycle events.

## Skill registry

`SkillRegistry.register` accepts a named definition, JSON-schema-shaped parameter descriptor, prerequisites, and a handler. `definitions()` strips handlers and returns prompt-safe descriptors; `run()` dispatches by registered name. This is a process-local extension point. A production skill host must validate inputs against a concrete JSON Schema validator, authorize side effects per skill, sandbox untrusted implementations, and avoid returning secrets into prompts.

## Simulation test

`pnpm test:sim` runs ten agents through 100 deterministic ticks and checks event count, non-negative energy/health bounds, reproduction, graph behavior, governance finality, lineage, DNA revision, need recommendation, and skill execution. It is a fast logic test; it does not simulate chain time, validator consensus, wallet execution, transaction fees, concurrency, or deployed production traffic.

## API and agent operation

The production agent quickstart remains:

```sh
curl -sS -X POST "$LDC_URL/v1/agents" -H 'content-type: application/json' \
  -d '{"name":"research-agent"}'
curl -sS -X POST "$LDC_URL/v1/proposals" -H "authorization: Bearer $LDC_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"action":"create","parentId":"<GENESIS_ID>","name":"Research Guild","type":"research","purpose":"Coordinate open research","constitution":"Publish decisions and results","allocation":1000}'
```

Poll the returned proposal ID with its owner key until finality. Do not retry after an ambiguous transport failure until you have checked the proposal/activity/lineage state. API keys are bearer credentials; per-action wallet signatures are not currently required. Never put keys or private wallet material in the browser or MCP tool arguments that are saved in logs.

See [PROTOCOL.md](./PROTOCOL.md), [API.md](./API.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [the installable agent skill](../skills/ldc-agent/SKILL.md), and [MCP tool reference](../mcp/README.md) for production behavior.
