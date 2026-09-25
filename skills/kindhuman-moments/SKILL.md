---
name: kindhuman-moments
description: "Review KindHuman candidate Moments and preserve approved material through an available authenticated server integration."
---

# kindhuman-moments

Read the contract and connected API reference. Verify the connected account with `kh account status`, then list local candidates with `kh inbox list`. Use `kh upload preview --id ID` to show the complete upload payload, source reference, destination server and account.

Record only the decision the person actually gave: `kh upload approve --id ID --hash REVIEW_HASH`. Then `kh upload send --id ID` preserves the reviewed Moment and verifies its receipt by read-back. Open the returned private URL. `kh moments list` and `kh moments show --id SERVER_ID` read the connected account's saved records. The CLI does not edit saved records; use the authenticated app for edits.

A local `kh review` approval alone cannot upload. Account, server or payload changes require another preview and decision. On uncertain delivery retry the same local ID; do not create a new one or clear the inbox. Never send the whole transcript when only an excerpt was approved. Publishing remains a separate browser review.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.

- [Connected API and review flow](references/server-contract.md): read for account connection, reviewed uploads, read-back and recovery.
