# Delivery status

Version 0.2 adds a connected text workflow to the original local foundation: per-agent token connection, exact account/destination review, private save, idempotent retry and read-back verification. The Prisma app now provides tenant-scoped storage and path-based lanes. A deployment must expose these endpoints before setup can claim a live result.

Remaining work: OAuth device login, connector clients for selected remote sources, native scheduler registration/status, binary uploads, CLI edits, Snapshot creation and sharing. Existing browser capabilities cover editing, Snapshots and explicit publication.

Acceptance: installation discovers skills; the intended account verifies; one selected source is actually read; first check-in runs immediately; a real candidate receives account-bound human review; upload is read back; its private URL opens; the native scheduler is registered at the user's chosen cadence. Report any incomplete step. Never manufacture a sample personal memory to complete setup.
