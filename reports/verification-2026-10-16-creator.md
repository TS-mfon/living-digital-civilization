# Creator API verification — 2026-10-16

Result: baseline PASS. All 45 assertions passed across 13 live HTTP exchanges from `2026-10-16T02:26:51.491Z` through `2026-10-16T02:28:28.259Z`.

Production API: `https://living-digital-civilization.vercel.app/v1`. Existing creator: `c4504042-3459-4bbe-919a-61621d992b7b` (`LDC Genesis Creator 2026-10-15T03-03-34.698Z`). The existing private key authenticated successfully; no duplicate identity or valid proposal was created.

## Pass 1 — live requests

Timestamps mark request start in UTC. Status and elapsed time come from curl. Authenticated requests used a private temporary configuration; credentials and request headers are omitted.

| UTC | Method and path | Authenticated | HTTP | Milliseconds | Case |
| --- | --- | --- | --- | --- | --- |
| 2026-10-16T02:26:51.491Z | `GET /v1/agents/me` | yes | 200 | 3714 | me |
| 2026-10-16T02:26:51.575Z | `GET /v1/health` | no | 200 | 3369 | health |
| 2026-10-16T02:26:51.575Z | `GET /v1/organizations` | no | 200 | 3220 | organizations |
| 2026-10-16T02:26:51.575Z | `GET /v1/metrics` | no | 200 | 1614 | metrics |
| 2026-10-16T02:26:51.575Z | `GET /v1/activity?limit=100` | no | 200 | 3278 | activity_before |
| 2026-10-16T02:26:51.575Z | `GET /v1/agents?limit=100` | no | 200 | 1389 | agents |
| 2026-10-16T02:27:45.282Z | `GET /v1/organizations/0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640` | no | 200 | 3012 | genesis |
| 2026-10-16T02:27:45.282Z | `GET /v1/lineage/0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640` | no | 200 | 3189 | lineage |
| 2026-10-16T02:27:58.046Z | `POST /v1/proposals` | no | 401 | 679 | Unauthenticated creation |
| 2026-10-16T02:27:58.802Z | `POST /v1/proposals` | yes | 400 | 764 | Missing creation fields |
| 2026-10-16T02:27:59.645Z | `POST /v1/proposals` | yes | 400 | 648 | Malformed parent and negative allocation |
| 2026-10-16T02:28:00.352Z | `POST /v1/proposals` | yes | 400 | 639 | Non-integer allocation |
| 2026-10-16T02:28:28.259Z | `GET /v1/activity?limit=100` | no | 200 | 625 | activity_after |

Relevant sanitized response fields:

```json
{
  "me": {
    "agent": {
      "id": "c4504042-3459-4bbe-919a-61621d992b7b",
      "name": "LDC Genesis Creator 2026-10-15T03-03-34.698Z"
    },
    "activeKeyCount": 1
  },
  "health": {
    "ok": true,
    "service": "living-digital-civilization-api",
    "mode": "testnet",
    "base": "connected",
    "genlayer": "configured"
  },
  "organizations": {
    "organizationCount": 1,
    "demo": false,
    "genesisId": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
    "status": "active",
    "resourceUnits": 1000000
  },
  "metrics": {
    "totalAgents": 12,
    "totalEvents": 24,
    "eventThroughput": 0,
    "totalOrganizations": 1,
    "activeOrganizations": 1,
    "resourceUnitsGoverned": 1000000,
    "maxGeneration": 0,
    "epoch": null,
    "epochSource": "not implemented by the current protocol"
  },
  "activity_before": {
    "eventCount": 24,
    "newestEventId": "24",
    "newestEvent": "evaluation.rejected",
    "demo": false
  },
  "agents": {
    "agentCount": 12,
    "creatorPresent": true,
    "publicFields": [
      "id",
      "name",
      "createdAt"
    ]
  },
  "genesis": {
    "id": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
    "status": "active",
    "childrenCount": 0,
    "demo": false
  },
  "lineage": {
    "focusId": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
    "ancestorCount": 0,
    "childrenCount": 0,
    "familyVersionCount": 1,
    "demo": false
  },
  "activity_after": {
    "eventCount": 24,
    "newEventCount": 0,
    "snapshotUnchanged": true,
    "newCreatorProposalSubmittedCount": 0,
    "demo": false
  },
  "unauth_create": {
    "error": "unauthorized",
    "message": "Use a valid agent API key."
  },
  "missing_fields": {
    "error": "invalid_request",
    "details": {
      "formErrors": [
        "Create requires parentId, name, type, and purpose"
      ],
      "fieldErrors": {}
    }
  },
  "bad_parent_negative_allocation": {
    "error": "invalid_request",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "parentId": [
          "Invalid string: must match pattern /^0x[0-9a-fA-F]{64}$/"
        ],
        "allocation": [
          "Too small: expected number to be >=0"
        ]
      }
    }
  },
  "fractional_allocation": {
    "error": "invalid_request",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "allocation": [
          "Invalid input: expected int, received number"
        ]
      }
    }
  }
}
```

Invalid request payloads, in execution order:

```json
[
  {
    "case": "Unauthenticated creation",
    "payload": {
      "action": "create"
    }
  },
  {
    "case": "Missing creation fields",
    "payload": {
      "action": "create"
    }
  },
  {
    "case": "Malformed parent and negative allocation",
    "payload": {
      "action": "create",
      "parentId": "invalid-parent",
      "name": "Invalid creation verification",
      "type": "research",
      "purpose": "This payload must be rejected before a proposal is created.",
      "allocation": -1
    }
  },
  {
    "case": "Non-integer allocation",
    "payload": {
      "action": "create",
      "allocation": 0.5
    }
  }
]
```

## Pass 2 — expert assertion review

All 45 checks below were evaluated against saved live response bodies, including expected failure statuses. Empty or missing bodies cannot satisfy these checks.

- PASS: me returns expected HTTP status.
- PASS: me response contains no credential material.
- PASS: health returns expected HTTP status.
- PASS: health response contains no credential material.
- PASS: organizations returns expected HTTP status.
- PASS: organizations response contains no credential material.
- PASS: metrics returns expected HTTP status.
- PASS: metrics response contains no credential material.
- PASS: activity_before returns expected HTTP status.
- PASS: activity_before response contains no credential material.
- PASS: agents returns expected HTTP status.
- PASS: agents response contains no credential material.
- PASS: genesis returns expected HTTP status.
- PASS: genesis response contains no credential material.
- PASS: lineage returns expected HTTP status.
- PASS: lineage response contains no credential material.
- PASS: unauth_create returns expected HTTP status.
- PASS: unauth_create response contains no credential material.
- PASS: missing_fields returns expected HTTP status.
- PASS: missing_fields response contains no credential material.
- PASS: bad_parent_negative_allocation returns expected HTTP status.
- PASS: bad_parent_negative_allocation response contains no credential material.
- PASS: fractional_allocation returns expected HTTP status.
- PASS: fractional_allocation response contains no credential material.
- PASS: activity_after returns expected HTTP status.
- PASS: activity_after response contains no credential material.
- PASS: Existing creator UUID matches authenticated /agents/me.
- PASS: Creator has exactly one active key.
- PASS: Public health reports testnet with Base connected and GenLayer configured.
- PASS: Public organization collection contains active Genesis.
- PASS: Organization collection is non-demo.
- PASS: Genesis detail and lineage identify the same organization.
- PASS: Genesis lineage has no ancestors.
- PASS: Public directory includes creator.
- PASS: Public directory fields are public metadata only.
- PASS: Metrics match the organization snapshot.
- PASS: unauth_create has neither proposal ID nor chain transaction.
- PASS: missing_fields has neither proposal ID nor chain transaction.
- PASS: bad_parent_negative_allocation has neither proposal ID nor chain transaction.
- PASS: fractional_allocation has neither proposal ID nor chain transaction.
- PASS: Missing fields produce explicit creation requirements.
- PASS: Bad parent and negative allocation each receive field errors.
- PASS: Fractional allocation receives an integer validation error.
- PASS: Full activity snapshot unchanged after all invalid requests.
- PASS: Activity contains actual event names and structured detail.

The route source at `apps/api/src/server.ts:161` authenticates before parsing the proposal schema. Validation and organization checks precede `createProposal`, the `proposal.submitted` event, and `submitEvaluation`. Live 401/400 responses contained neither proposal IDs nor transaction references. The entire activity snapshot remained identical at 24 events after all four POST requests. This is evidence that these invalid requests did not enter proposal submission.

## Pass 3 — missing-verification and bug hunt

No creator-baseline API defect was observed. The actual activity schema uses `event` and JSON-encoded `detail`; the final assertions compare the entire saved snapshot, avoiding an incorrect absence check based on guessed field names. Error details independently identify both the malformed parent and negative allocation, and identify the fractional allocation as a non-integer. Public identity responses expose only ID, name, and creation time.

This baseline does not verify approving GenLayer consensus, a successful Base transaction, or a created organization. Health reports adapter availability/configuration, not lifecycle completion. A valid creation remains sequenced by the parent after deployment.

At `2026-10-16T02:25:54Z`, an initial Python-subprocess transport attempt failed DNS resolution for its requests and received no HTTP responses. Those transport-only attempts are excluded from the passing count. Standalone curl tool commands subsequently produced the recorded production responses; no approval escalation was requested.

## Pass 4 — evidence polish

The response schema, request timestamps, statuses, integer latencies, payloads, UUID, Genesis ID, activity snapshot, and assertion count were reviewed. A programmatic scan of this report and all recorded responses found no raw API key or credential-bearing response fields. Source, deployment configuration, and identities were not modified. The creator leaf gate is complete for this baseline only.

## Genuine creation — authorized post-deployment attempt

Deployment `dpl_9qhPFjCHsWgkLQ2Z5Ru3fJ8sKqtk` was confirmed READY by the parent. Immediately before preparing this one submission, Genesis detail returned HTTP 200 with status `active` and 1000000 resource units. The request body is compact JSON; it allocates 500 units. No POST retry is permitted.

Prepared at `2026-10-16T02:36:00.528544+00:00`.

```json
{
  "action": "create",
  "parentId": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
  "name": "Civic Infrastructure 20261016T023600Z 178a57",
  "type": "infrastructure",
  "purpose": "Coordinate independently verifiable infrastructure maintenance and shared operational standards across the civilization. Publish quarterly service health reports, open procurement decisions, and an auditable maintenance record. Prioritize work using measurable reliability targets within the parent-approved allocation.",
  "constitution": "Limit authority to infrastructure coordination and the 500 allocated resource units. Publish spending records and maintenance evidence; review mission progress quarterly; preserve parent lineage and the immutable constitutional core. Do not control the parent treasury or unrelated institutions.",
  "allocation": 500
}
```

Submitted once at `2026-10-16T02:36:13.230513+00:00`; response observed at `2026-10-16T02:36:30.803948+00:00`.

```json
{
  "proposalId": "e769a85e-b32a-4a37-af2c-73aa723ba60e",
  "status": "evaluating",
  "genlayerTx": "0x5ceb6c45ee17815f27a7864ab498412002fc3e877ab96aca48f56c2150c4b316",
  "demo": false
}
```

Terminal owned-proposal read returned HTTP 200, `status=active`, and no error. Complete sanitized proposal/evaluation:

```json
{
  "id": "e769a85e-b32a-4a37-af2c-73aa723ba60e",
  "agentId": "c4504042-3459-4bbe-919a-61621d992b7b",
  "action": "create",
  "parentId": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
  "organizationId": null,
  "name": "Civic Infrastructure 20261016T023600Z 178a57",
  "type": "infrastructure",
  "purpose": "Coordinate independently verifiable infrastructure maintenance and shared operational standards across the civilization. Publish quarterly service health reports, open procurement decisions, and an auditable maintenance record. Prioritize work using measurable reliability targets within the parent-approved allocation.",
  "constitution": "Limit authority to infrastructure coordination and the 500 allocated resource units. Publish spending records and maintenance evidence; review mission progress quarterly; preserve parent lineage and the immutable constitutional core. Do not control the parent treasury or unrelated institutions.",
  "allocation": 500,
  "status": "active",
  "evaluation": {
    "action": "create",
    "approved": true,
    "constitution": "Article I \u2014 Mission. The Civic Infrastructure organization exists to coordinate independently verifiable infrastructure maintenance and shared operational standards across the civilization. It produces quarterly service health reports, publishes open procurement decisions, and maintains an auditable maintenance record. Work is prioritized using measurable reliability targets within the parent-approved allocation.\n\nArticle II \u2014 Authority Limits. (a) Authority is strictly limited to infrastructure coordination functions and the 500 allocated resource units. (b) The organization may not control the parent treasury, direct unrelated institutions, or exercise powers beyond coordination, reporting, and procurement transparency within its scope. (c) The immutable constitutional core and parent lineage are preserved; this constitution cannot amend, override, or bypass either. (d) No action may remove, weaken, or circumvent immutability protections established by the parent or by this constitution.\n\nArticle III \u2014 Resource Discipline. (a) Total resource expenditure shall not exceed 500 units without explicit parent re-authorization. (b) All spending records, procurement decisions, and maintenance evidence shall be published in a verifiable form. (c) Resource use shall be tied to measurable reliability targets; allocations inconsistent with stated targets require documented justification.\n\nArticle IV \u2014 Review Rules. (a) Mission progress shall be reviewed quarterly, coinciding with the published service health report. (b) The constitution shall be reviewed at least annually and may be amended only through a documented process that preserves the immutable core and parent lineage. (c) Any proposed expansion of authority, resource ceiling, or scope requires parent approval before effect. (d) All reviews and decisions shall be recorded in the auditable maintenance record.\n\nArticle V \u2014 Prohibited Actions. (1) Bypassing evaluation or review criteria. (2) Creating arbitrary or unsafe code. (3) Removing or weakening immutable protections. (4) Asserting unverified facts as established. (5) Acting outside the coordination, reporting, and procurement-transparency scope defined herein.",
    "organization_id": "",
    "parent_id": "0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640",
    "proposal_id": "e769a85e-b32a-4a37-af2c-73aa723ba60e",
    "rationale": "The proposal is coherent: it defines a clearly scoped infrastructure-coordination organization with a distinct purpose (verifiable maintenance, shared operational standards, public reporting). It is safe: it does not request treasury control over the parent, does not seek to override immutable protections, and does not attempt to bypass evaluation criteria. It is non-duplicative: the parent ID is provided and the new org occupies a complementary coordination role rather than overlapping an existing function. It is appropriately scoped: resource allocation is modest (500 units), bounded to its own coordination activities, and tied to measurable reliability targets. It is consistent with the parent mission as inferred from the lineage: a civilization-scale ecosystem plausibly benefits from an independent, transparent infrastructure coordination body that publishes auditable records and open procurement decisions. The submitted constitution already contains the required elements (mission, authority limits, resource discipline, review rules), and is refined below for clarity and completeness. No unverified factual claims are made; the approval is conditional on deployment, not a claim that the organization is operational."
  },
  "genlayerTx": "0x5ceb6c45ee17815f27a7864ab498412002fc3e877ab96aca48f56c2150c4b316",
  "baseTx": "0x39d203017f57620a5ae3eabe32f9153952af12e1133403547b9934fad03d5d53",
  "error": null,
  "createdAt": "2026-10-16T02:36:14.281Z",
  "updatedAt": "2026-10-16T02:38:03.654Z"
}
```
