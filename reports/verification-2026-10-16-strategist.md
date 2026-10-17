# Strategist production API verification — 2026-10-16

Baseline completed independently by the strategist tester. Authentication, Genesis lineage, metrics reconciliation, and eight evolution rejection cases passed. Two production defects were reproduced and sent to the integration owner: missing transaction-inspection routing and JSON body reserialization with a stale Content-Length. A third resource-admission defect was identified by source comparison. This baseline does not claim a successful evolution or repair deployment.

API: https://living-digital-civilization.vercel.app/v1. All timestamps below are UTC on 2026-10-16.

Existing strategist identity: `49e0ac41-07e0-4419-9fab-c2d5d28584e9`, display name `LDC Evolution Strategist 2026-10-15T03-03-34.698Z`. The existing private key was read locally through an owner-only temporary curl configuration. No key, authorization header, wallet secret, or environment value is included here. No identity or key was registered or rotated.

Path substitutions used in the evidence table:

- `{genesis}`: `0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640`
- `{historical_proposal}`: `944ad1e0-806c-4fd1-b44c-0c29a2c8155e`
- `{historical_tx}`: `0x2cd393754c58bf3f8a93c4f13f916a50081046d9b43e00518428c6596d657589`
- `{missing_id}`: `0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`

## Recorded HTTP evidence

31 HTTP exchanges are recorded in this baseline: 17 GETs and 14 invalid POSTs. Six POSTs exposed the JSON transport defect; eight compact JSON POSTs exercised application validation. The raw sanitized exchange records remain in `/tmp/ldc-strategist-20261016/baseline.jsonl` for parent review.

| UTC | Method and path | HTTP | Relevant response or comparison |
| --- | --- | --- | --- |
| 02:27:34.481 | `GET /health` | 200 | testnet; Base connected; GenLayer configured |
| 02:27:34.496 | `GET /agents/me` | 200 | strategist identity matched; activeKeyCount=1 |
| 02:27:34.496 | `GET /agents/me` | 401 | unauthorized |
| 02:27:34.496 | `GET /organizations` | 200 | Genesis active, generation 0, version 1, units 1,000,000; demo=false |
| 02:27:34.497 | `GET /metrics` | 200 | 12 agents; 24 events; 1 organization; 1 active; 1,000,000 units |
| 02:27:34.497 | `GET /activity?limit=100` | 200 | 24 events, latest id 24; historical rejection has no Base transaction |
| 02:27:34.497 | `GET /agents?limit=100` | 200 | 12 public identities; includes authenticated strategist |
| 02:28:12.493 | `GET /organizations/{genesis}` | 200 | matches list; no children; historical proposal and transaction present |
| 02:28:12.493 | `GET /lineage/{genesis}` | 200 | focus matches; one family version; no ancestors or children |
| 02:28:12.493 | `GET /inspect/{historical_tx}` | 404 | DEFECT: Vercel plain-text NOT_FOUND for indexed transaction |
| 02:28:12.493 | `GET /inspect/{historical_proposal}` | 404 | DEFECT: Vercel plain-text NOT_FOUND for indexed proposal |
| 02:28:12.493 | `GET /inspect/not-a-reference` | 404 | DEFECT: platform NOT_FOUND; expected API invalid_request/400 |
| 02:28:12.493 | `GET /inspect/{missing_id}` | 404 | platform NOT_FOUND; status alone does not verify application behavior |
| 02:28:12.493 | `GET /lineage/{missing_id}` | 404 | JSON not_found |
| 02:28:54.772 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:28:55.483 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:28:56.202 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:28:56.886 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:28:57.591 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:28:58.379 | `POST /proposals` | 400 | DEFECT: FST_ERR_CTP_INVALID_CONTENT_LENGTH; schema not reached |
| 02:29:58.327 | `POST /proposals` | 409 | genesis: immutable_genesis |
| 02:29:59.100 | `POST /proposals` | 400 | missing constitution: invalid_request |
| 02:30:00.188 | `POST /proposals` | 400 | empty constitution: invalid_request |
| 02:30:00.873 | `POST /proposals` | 400 | invalid id: invalid_request |
| 02:30:01.549 | `POST /proposals` | 400 | fractional allocation: invalid_request |
| 02:30:02.231 | `POST /proposals` | 400 | negative allocation: invalid_request |
| 02:30:02.891 | `POST /proposals` | 409 | missing organization: invalid_organization |
| 02:30:03.574 | `POST /proposals` | 401 | unauthenticated: unauthorized |
| 02:30:18.092 | `GET /organizations` | 200 | identical to before |
| 02:30:18.093 | `GET /metrics` | 200 | identical to before, including event count and governed units |
| 02:30:18.093 | `GET /activity?limit=100` | 200 | all 24 events identical to before; no proposal/evaluation submission event |

## Evolution validation and absence of side effects

The common JSON payload used action `evolve`, the Genesis organization ID above, name `Strategist Validation 2026-10-16`, type `infrastructure`, purpose `Verify invalid institutional evolution is rejected before any chain submission.`, constitution `Preserve the immutable constitutional core and publish auditable resource decisions.`, and allocation `0`. Each request independently changed only the tested field or authentication:

| Variation, sent as compact JSON | Expected and observed behavior |
| --- | --- |
| Omit constitution | 400 `invalid_request`; form error lists evolution requirements |
| Constitution is three spaces | 400 `invalid_request`; trimmed blank constitution rejected |
| organizationId is `not-an-organization` | 400 `invalid_request`; organizationId format error |
| allocation is `0.5` | 400 `invalid_request`; integer required |
| allocation is `-1` | 400 `invalid_request`; minimum is zero |
| organizationId is `{missing_id}` | 409 `invalid_organization` |
| Unmodified structurally valid payload targeting Genesis | 409 `immutable_genesis` |
| Unmodified payload without credentials | 401 `unauthorized` |

None of the 14 POST responses contained a proposal ID, GenLayer transaction, or Base transaction. Afterward, the full organization list, all metric fields, and all 24 activity records exactly matched the initial parsed responses. This confirms these requests did not enter the indexed proposal/evaluation lifecycle. No valid proposal was sent in this baseline.

Independent calculations from public organization and agent lists matched metrics: 12 agents, one organization, one active organization, 1,000,000 units summed only across active organizations, and maximum generation zero. Genesis detail matched the list; lineage had the same focus and one family version, with empty ancestors and children. Epoch was explicitly null, with the response stating that the current protocol does not implement it.

## Defects handed to the integration owner

1. **Transaction inspection does not reach the API in production.** At 02:28:12 UTC, both the known proposal UUID and known GenLayer transaction returned Vercel plain-text `NOT_FOUND`/404. The same references appeared in Genesis `recentProposals` and public activity, so these are valid positive controls. A malformed reference also returned platform 404 instead of API 400. The repository has explicit forwarding files for other nested API routes but lacked `api/v1/inspect/[reference].ts` when inspected. The missing-ID 404 is not counted as a successful API negative because its body was the platform error.

2. **Normal JSON whitespace breaks POST handling.** Six valid JSON bodies produced HTTP 400 with code `FST_ERR_CTP_INVALID_CONTENT_LENGTH` and message `Request body size did not match Content-Length`. Curl generated Content-Length from the complete payload file. Equivalent compact JSON reached schema/state validation, including the definitive 409 `immutable_genesis` response. The Vercel dispatch wrapper serializes an already parsed body with `JSON.stringify` while forwarding the original headers, which explains the byte-length mismatch. Fix the forwarded Content-Length to match the actual injected payload; verify pretty-printed and Unicode JSON as regressions.

3. **Evolution additional-allocation admission disagrees with the registry.** Source review found the API compares allocation with `parent.resourceUnits + source.resourceUnits`, while the Base registry treats it as additional allocation and requires `additionalAllocation <= parent.resourceUnits`. Example: parent=900, current version=100, requested additional allocation=950 passes the API but must revert on Base. This edge was not submitted live because the only organization was immutable Genesis and a deliberately doomed chain proposal would not be a useful validation request. The integration owner received the source finding and suggested regression case.

## Runner reachability and review

At 02:25:57 UTC, seven initial GETs launched with curl under Python failed with exit code 6 (`Could not resolve host`) before receiving any HTTP response. Direct `curl -sS` worked without an escalation: two preliminary health diagnostics returned 200, followed by the recorded baseline. All network requests in the evidence table were therefore executed directly; Python only prepared payloads and reviewed saved responses. Initial transport failures are retained separately at `/tmp/ldc-strategist-20261016/initial-transport-failures.jsonl`.

Four passes completed for this baseline: full execution; expert review of identity, lineage and accounting; defect hunting using indexed-reference positive controls, compact-versus-spaced JSON and registry/API resource semantics; and report review checking exact counts, response bodies, timestamps and credential redaction. All claims distinguish observed production behavior from source-only findings. Successful evolution and post-deployment retesting belong to the sequenced continuation controlled by the integration owner.
