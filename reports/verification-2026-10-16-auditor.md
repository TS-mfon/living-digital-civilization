# Independent auditor verification — 2026-10-16

The production auditor baseline passed authentication, one secondary-key lifecycle, rejected lifecycle inputs, HEAD behavior, CORS allowlist checks, and a real SSE connection with a heartbeat. No application defect was confirmed in this scope.

Target: https://living-digital-civilization.vercel.app. Existing agent: `aa1e20b1-7383-457a-a370-baee2ad158d4` (LDC Lifecycle Auditor 2026-10-15T03-03-34.698Z). The primary API key was read from its existing private file and was never revoked. The only secondary key issued was `942a371a-f4a4-4b7a-9ff8-f8878e80dfcd`; it was revoked successfully. No key values, authorization headers, or raw key-issuance payloads are included here.

There were **26 recorded HTTP exchanges covering 24 distinct cases**. The table keeps the final result for each case; both HEAD cases were repeated after correcting curl output interpretation. Times are UTC request-preparation timestamps. Ordinary elapsed measurements include tool scheduling and are not reported as network latency. SSE timings come from curl's receive trace.

| Started (UTC) | Method and path | HTTP | Sanitized observation |
| --- | --- | ---: | --- |
| 2026-10-16T02:29:47.998Z | GET `/v1/agents/me` | 200 | Primary key authenticated the existing auditor; 1 active key. |
| 2026-10-16T02:30:43.624Z | GET `/v1/agents/me` | 401 | No credential; `unauthorized`. |
| 2026-10-16T02:30:46.855Z | GET `/v1/agents/me` | 401 | Invalid credential; `unauthorized`. |
| 2026-10-16T02:30:48.219Z | POST `/v1/agents/keys` | 201 | Issued exactly one secondary key; key value stayed private. |
| 2026-10-16T02:30:51.054Z | GET `/v1/agents/me` | 200 | Secondary key authenticated the same agent; 2 active keys. |
| 2026-10-16T02:30:52.173Z | DELETE `/v1/agents/keys/942a371a-f4a4-4b7a-9ff8-f8878e80dfcd` | 200 | Original key revoked the secondary key; `revoked: true`. |
| 2026-10-16T02:30:55.739Z | GET `/v1/agents/me` | 401 | Revoked secondary key rejected as `unauthorized`. |
| 2026-10-16T02:30:56.802Z | GET `/v1/agents/me` | 200 | Original key still authenticated; active key count returned to 1. |
| 2026-10-16T02:30:57.934Z | DELETE `/v1/agents/keys/942a371a-f4a4-4b7a-9ff8-f8878e80dfcd` | 404 | Repeated secondary revocation returned `not_found`. |
| 2026-10-16T02:32:52.743Z | HEAD `/v1/agents/me` | 200 | Authenticated HEAD completed; curl measured 0 downloaded body bytes. |
| 2026-10-16T02:32:54.874Z | HEAD `/v1/stream` | 404 | HEAD completed with 0 downloaded body bytes; did not open a stream. |
| 2026-10-16T02:31:24.875Z | GET `/v1/agents/me` | 200 | Production-site Origin: no allow-origin header (observed allowlist behavior). |
| 2026-10-16T02:31:26.022Z | GET `/v1/agents/me` | 200 | Unrelated Origin: no allow-origin header. |
| 2026-10-16T02:31:27.071Z | OPTIONS `/v1/agents/keys` | 204 | Production-site Origin: no allow-origin; methods and requested headers returned. |
| 2026-10-16T02:31:30.741Z | GET `/v1/organizations` | 200 | `demo: false`; one active Genesis organization at baseline. |
| 2026-10-16T02:32:56.010Z | GET `/v1/agents/me` | 200 | Documented development Origin accepted with matching allow-origin. |
| 2026-10-16T02:32:57.311Z | OPTIONS `/v1/agents/keys` | 204 | Development-origin preflight accepted; POST and authorization/content-type allowed. |
| 2026-10-16T02:32:58.747Z | POST `/v1/proposals` | 400 | Missing organization ID: `invalid_request`. |
| 2026-10-16T02:33:01.520Z | POST `/v1/proposals` | 400 | Malformed organization ID: `invalid_request`. |
| 2026-10-16T02:33:03.792Z | POST `/v1/proposals` | 409 | Zero organization ID: `invalid_organization`. |
| 2026-10-16T02:33:06.669Z | POST `/v1/proposals` | 400 | Negative allocation: `invalid_request`. |
| 2026-10-16T02:33:09.074Z | POST `/v1/proposals` | 409 | Genesis retirement: `immutable_genesis`. |
| 2026-10-16T02:33:11.335Z | POST `/v1/proposals` | 409 | Genesis evolution: `immutable_genesis`. |
| 2026-10-16T02:33:27.486Z | GET `/v1/stream` | 200 | Connected at 626 ms; heartbeat at 20,617 ms; still open at intentional 24 s timeout. |

The six proposal requests above were chosen to fail before proposal insertion. Each response omitted `proposalId`, `genlayerTx`, and `baseTx`. The source route was reviewed to confirm that these validation and Genesis checks run before `createProposal` and `submitEvaluation`. No valid create, evolve, or retire request was submitted by this baseline.

The CORS positive control used the documented `http://localhost:5173` origin and passed on both JSON and SSE responses. `https://living-digital-civilization.vercel.app` and `https://auditor-origin.invalid` received no allow-origin header. Same-origin browser use does not require CORS permission; this is an observed configuration choice, not a confirmed defect. A different intended browser allowlist would need a configuration change.

SSE returned `text/event-stream; charset=utf-8`, `cache-control: no-cache, no-transform`, the configured allow-origin, `: connected`, and `: ping`. The heartbeat followed the connection frame by **19,991 ms**. Curl deliberately stopped after **24.001496 s**, having received **21 bytes**; exit 28 is expected for that bounded observation. This verifies connection and heartbeat delivery. Cross-instance lifecycle-event fanout was not tested.

The test harness initially misread the header copy emitted by curl's HEAD option as body content. Independent `size_download` measurements and corrected parsing both confirmed zero body bytes on the repeat checks. Initial positive-CORS assertions also assumed the production-site origin was allowlisted; the documented development-origin positive control resolved that assumption. These were corrected test assumptions, not server failures. An earlier nested-process network attempt was stopped before any key issuance; standalone curl calls completed the checks.

All four leaf passes were completed: full test execution, source and evidence review, a defect hunt that corrected the HEAD/CORS test assumptions, and final secret/count/status verification. Gate `leaf-1.3:A3` has direct observed evidence. Any genuine retirement exercise remains separately sequenced by the parent after deployment.
