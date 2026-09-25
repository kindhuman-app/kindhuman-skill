# Proposed agent API contract

Design only. No endpoints below are implemented by this repository, and they must not be assumed to exist in the current KindHuman app.

## Account connection

Use a browser-mediated device authorization flow or OAuth authorization code with PKCE, tied to the existing KindHuman User. Let the person see which account and agent/device they are connecting. The CLI must never collect a password or reuse another user's browser session.

On successful authentication, `GET /api/v1/me` returns a stable account ID and canonical private-app URL. Read/write requests derive owner identity from the token; ignore or reject a client-provided owner ID. Use scoped, expiring/revocable agent grants. Publishing should be a distinct scope, requested only when needed.

Do not replace same-origin browser CSRF checks with permissive CORS to make the CLI work. Use an explicit authenticated agent API boundary while retaining browser protections.

## Local candidate and review

The source connector stores provenance, selected original content, machine suggestions and the person's reflection locally. A versioned review preview identifies exactly which fields/media will be sent and to which authenticated account. Approval binds a hash of the entire proposed payload, account ID, source version and decision time. Content changes, attachment changes or account changes invalidate approval.

The v0.1 local CLI approval binds captured text/source identity and records no server account binding. It MUST be re-reviewed and account-bound when migrating into this future API flow. Do not auto-upload old approved-local items after login.

## Suggested endpoints

| Endpoint | Contract |
|---|---|
| `GET /api/v1/me` | Verify token identity and capabilities; no user-selected owner override |
| `POST /api/v1/moments` | Create one reviewed private Moment; require per-account idempotency key |
| `GET /api/v1/moments/:id` | Owner-scoped read-back, revision and canonical private URL |
| `PATCH /api/v1/moments/:id` | Version-aware update of reviewed fields; conflict on stale revision |
| `POST /api/v1/assets` | Upload only reviewed media with per-user quotas and ownership metadata |
| `POST /api/v1/snapshots` | Fixed versions of the owner's approved Moments; reject mixed-owner references |
| `POST /api/v1/publications` | Separate, explicit publication payload, selected audience and revision |
| `DELETE /api/v1/publications/:id` | Unpublish projection and invalidate public caches without deleting original |

Candidate create envelope:

```json
{
  "schemaVersion": 1,
  "clientCaptureId": "stable-local-id",
  "review": { "payloadHash": "sha256-of-reviewed-payload", "approvedAt": "ISO-8601" },
  "payload": {
    "originalWords": "exact selected source words",
    "words": "reviewed Moment wording",
    "eventAt": null,
    "provenance": { "kind": "conversation", "sourceRef": "reviewed-source-reference", "author": "known speaker" },
    "reflection": null,
    "interpretation": null,
    "assets": []
  }
}
```

This is a proposed envelope, not a finalized schema. Final validation must cap sizes, validate dates and kinds, reject unexpected fields, verify owned asset references and distinguish human reflection from AI interpretation. A client review assertion is audit metadata, not cryptographic proof of a human click; the client UI/agent workflow enforces actual review. Stronger server-assisted review must not upload the unreviewed body merely to display it.

Idempotency is per account: `(ownerId, clientCaptureId)` or `(ownerId, idempotencyKey)` is unique. A replay with the same hash returns the original result; the same key with different content returns conflict. Global IDs must never leak another account's existing record.

## Completion and retry

A successful POST returns record ID, revision, approved payload hash and a canonical private URL. The client reads back the record under the same identity and checks the hash/revision before marking it synced. Timeouts remain pending/uncertain and retry using the same key. Auth failures request reconnection; content conflicts require review. Never switch accounts or replay with a new identity silently.

Media approval precedes storage upload. Introduce staged reviewed uploads and clean up abandoned server assets using an explicit retention policy. Raw local source files stay local unless included in the reviewed payload. Credentials, raw agent logs and unrelated source context never enter Moment metadata.

## Tenant isolation and deployment gate

Exercise the API and public pages with two accounts, not just mocked owner IDs. Cover reads, writes, exports, media, nested Snapshots, links, caches, concurrent revisions and publication. Verify tenant-neutral errors and no private caching. Deploy only after the same first-session journey works against the deployed account and public/private routes.
