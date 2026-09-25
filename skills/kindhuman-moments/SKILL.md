---
name: kindhuman-moments
description: "Review KindHuman candidate Moments and preserve approved material through an available authenticated server integration."
---

# kindhuman-moments

Read the contract. List candidates, then show the complete selected item's original text and provenance with `kh inbox show`. Ask the person to approve, change or dismiss the exact private upload proposal. Use `kh review --id ID --digest DIGEST --decision approve|dismiss` only to record the decision they actually gave.

In v0.1 this produces approved-local or dismissed state and performs no upload. Report that truthfully. Do not call the app's User 0 endpoints, invent a bearer token, or use shared credentials.

When a supported per-user adapter is implemented, authenticate first, confirm the destination account, send only the reviewed content with an idempotency key, then read back the record and its private URL. An account change or payload change requires a fresh review. Do not send the whole inbox or raw attachments when the person reviewed only an excerpt. Public sharing remains separate.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.
