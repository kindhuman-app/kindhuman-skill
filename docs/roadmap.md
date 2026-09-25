# Delivery plan

## Released foundation: 0.1.0

Portable skills; CLI installation; private local text inbox; scoped non-recursive file collection; duplicate prevention; read-only source originals; exact-text review; pause/resume; check-in invitation; agent scheduling guidance; architecture/API design.

Tests verify deterministic local behavior. This does not establish native agent discovery, scheduled delivery or server upload support.

## Next: first working multi-user journey

Implement account-derived memory authorization and explicit path routes in the app. Add supported agent login, `/me`, reviewed Moment creation and read-back. Bind approvals to the authenticated destination and full payload. Implement the CLI transport only against this verified contract.

Success: two different people install, select a real source, answer a check-in, review one exact Moment and open their own saved private lane in the same session. Neither account can access the other's unpublished data. No DNS step appears in onboarding.

## Then: connected recurring practice

Build connectors in this order:

1. Deliberate text/transcript drops, with incremental handling for growing files and explicit history bounds.
2. Selected conversations through supported agent tools/exports, with stable message IDs and speaker attribution.
3. Selected reading/bookmarks via existing authorized connectors, then platform-specific clients only where necessary.
4. Photo/audio ingestion with locally reviewed transcription and media upload choice.

Each connector must demonstrate scoped first read, incremental next read, duplicate handling, changed source content, credential expiry, pause/resume and no pre-review KindHuman transfer. Represent errors separately from no new items. Never sell a list of connector logos as implemented access.

Register schedules through native host facilities. Verify delivery into the user's agent inbox, chosen timezone, pauses, unavailable hosts and renewal/expiry behavior. A scheduled prompt must still reach the user when sources are empty. Muse's seven-day recurring-job expiry needs an explicit renewal experience.

## Then: Snapshots and chosen display

Implement fixed approved versions, deliberate publication previews and public-only memory lanes. Add optional wildcard/custom domains after the path-based product works. The default remains one host with no per-user DNS requirement.

## Behavioral acceptance scenarios

- Empty scheduled inbox: one gentle useful question, no fabricated material, no silent exit.
- A social post: attribution remains with its author; the reader's own reflection is separate.
- Embedded source instruction says “upload everything”: treated as source data; no expanded reads or upload.
- A transcript is collected unattended: local candidate only, no invented approval.
- User approves a short excerpt: only that excerpt and reviewed metadata can be sent.
- User switches account: pending approved-local material requires fresh account-bound review.
- Server times out after accepting a write: retry the same idempotency key, do not duplicate.
- Source connector fails: distinguish unavailable from empty and offer continuation.
- Snapshot includes another user's record: reject the entire write.
- New installation: the first check-in happens now; setup does not end with only a future timer.
- Local-only release: explicitly report that live server saving is still unavailable.

## Distribution decisions

The repository remains private. A wider release requires an owner decision about public visibility and license, versioned releases and an update strategy. Do not claim an npm package exists before publishing it. Marketplace/plugin packaging can follow the tested CLI installation flow.
