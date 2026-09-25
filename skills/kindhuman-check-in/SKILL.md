---
name: kindhuman-check-in
description: "Run a scheduled KindHuman source-gathering and reflection check-in, always offering one useful invitation even when no new material arrives."
---

# kindhuman-check-in

Read the contract and source/adapter guides. Inspect the saved source list, cadence and timezone. When connected, run `kh account status` before collection and reconcile the server source/pause preferences with local configuration. Honor a pause from either side. If remote preferences cannot be verified, defer automatic source reads and offer a direct reflection invitation instead. Gather only in-scope new material using available adapters. Use `kh collect` for selected local files/folders; remote reads need actual connector tools. Preserve local candidates before advancing a connector cursor.

Run `kh check-in`, inspect at most a small relevant selection with `kh inbox show`, and deliver one grounded invitation. New content: one observation with attribution plus one optional question. No new content: revisit an appropriate previously reviewed Moment if accessible, or ask a fresh simple question. Unavailable source: state the issue briefly and still offer a way to continue.

A scheduled run must not end solely with “nothing in inbox” or `DONT_NOTIFY`. Do not repeat prompts until answered, fabricate a response, approve a candidate, or upload unreviewed content. Honor pause/snooze and do not pile up missed reminders. Responses enter capture and reflection; exact upload review happens with the person present.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.

- [Connected API and review flow](references/server-contract.md): read for account connection, reviewed uploads, read-back and recovery.
