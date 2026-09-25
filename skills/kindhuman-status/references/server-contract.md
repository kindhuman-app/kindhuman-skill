# Connected agent API, v0.2

The Prisma KindHuman app implements this contract. Connect only to a deployment that serves it; a pushed commit alone does not prove deployment readiness.

## Connect

Sign in to the intended KindHuman host, open `/app/setup`, and create an agent connection. The token is shown once, expires after 90 days, and can be revoked there. This is a personal agent token, not OAuth device login. Never reuse another person's session or collect their password.

Provide the token as `KH_TOKEN` through the host credential mechanism, then run:

```sh
kh account connect --server https://YOUR_KINDHUMAN_HOST
kh account status
```

Do not put a token in command arguments, chat, skills, source files or Git. The CLI reads it from the environment each run and never saves it. Local `config.json` stores only the server origin and verified account ID. HTTPS is required except loopback development. Redirects are refused so credentials cannot follow a redirect to another host.

`account status` verifies `/api/v1/me` and returns server source preferences and the chosen rhythm/timezone. Read these during setup and check-ins. Reconcile them with the user's selected local sources and native schedule; they are configuration, not evidence that a connector or scheduler is running. Remote settings never silently overwrite local sources or schedules. Pause preferences must be honored by the agent.

## Review and save

```sh
kh upload preview --id LOCAL_ID
# Show the entire payload, source reference, server and account to the person.
# After their explicit decision approving that exact upload:
kh upload approve --id LOCAL_ID --hash REVIEW_HASH
kh upload send --id LOCAL_ID
kh moments show --id SERVER_RECORD_ID
```

`preview` contacts the identity endpoint but sends no capture content. `approve` stores the human decision locally; never invoke it unattended. `send` is the only command that uploads capture content. The review hash binds the server, account and every payload field. Old `review` / `approved-local` decisions are insufficient. An account, origin, reflection or source change requires a fresh preview and decision.

The initial connected payload is text-only: exact `originalWords`, trimmed display `words`, nullable event time, empty views, selected source reference/kind, unknown author as null and an optional human reflection. Machine interpretations and binary files are not sent. Local filesystem paths may be present as source references: show them as part of review. For excerpts, capture the selected excerpt rather than uploading an entire transcript. The CLI limits text to 20,000 characters.

Endpoints:

| Endpoint | Implemented purpose |
|---|---|
| `GET /api/v1/me` | Verify token, account and configured source/rhythm preferences |
| `GET /api/v1/moments` | Read this account's Moments and Snapshots |
| `POST /api/v1/moments` | Ingest a reviewed private text Moment |
| `GET /api/v1/moments/:id` | Read the account's record and ingestion receipts |

Envelope:

```json
{
  "schemaVersion": 1,
  "clientCaptureId": "stable-local-uuid",
  "review": {
    "accountId": "verified-account-id",
    "approvedAt": "ISO-8601",
    "payloadHash": "sha256-of-canonical-json-of-accountId-and-payload"
  },
  "payload": {
    "words": "Reviewed display words",
    "originalWords": "Exact selected source words",
    "eventAt": null,
    "views": [],
    "provenance": {"kind": "conversation", "sourceRef": "reviewed source reference", "author": null},
    "reflection": null
  }
}
```

Canonical JSON sorts object keys recursively, preserving array order and string bytes. The server hash covers `{accountId, payload}`; the local review hash additionally covers the server origin. Approval is a client audit assertion, not cryptographic proof of a human decision.

## Verification and recovery

The CLI writes `awaiting-confirmation` before POST. It marks `synced` only after GET read-back confirms the record, exact original and matching capture/hash receipt, and returns a private `/app/moments/:id` URL. A timeout, redirect, bad response or failed read-back leaves confirmation pending. Retry `upload send` with the same local ID. Do not manufacture a new ID to resolve an uncertain write. The server deduplicates by account/capture ID and rejects changed content under an existing ID.

`kh status` is a local snapshot, not live authentication. Use `account status` to check token health. `account disconnect` removes local account binding but does not revoke the token; revoke in setup. Neither disconnect nor retry deletes source material.

Snapshot creation, editing, media upload and public sharing use the app's reviewed browser flow; the CLI has no mutation commands for them. Source connector clients and native scheduler registration remain agent responsibilities. Do not bypass the browser's session or origin checks.
