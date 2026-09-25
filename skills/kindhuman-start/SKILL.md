---
name: kindhuman-start
description: "Set up KindHuman in an agent, choose sources and a check-in schedule, and experience the first capture and review immediately."
---

# kindhuman-start

Read the operating contract, agent adapter, and source guide below. Start with three connected decisions: sources and their boundaries; the user's cadence/timezone; and their KindHuman account. Upload policy is review-first, already settled.

Use `kh init --timezone ZONE --rhythm "CHOSEN RHYTHM"`. Do not set a default cadence or overwrite an existing configuration. Register and verify one source, collect a real item now, and ask one grounded reflection question. If there is no item, invite the person to share something that stayed with them today. Do not postpone all value until a timer fires.

Connect to the intended deployed app: create an agent token in `/app/setup`, provide it through the host credential mechanism as `KH_TOKEN`, and run `kh account connect --server https://HOST`. Verify the account and read its preferences with `kh account status`. Do not paste tokens into chat or command arguments. Reconcile source and cadence preferences with the person; do not silently overwrite a native schedule.

Run `kh upload preview --id ID` and show the entire payload, provenance, server and account. After the person's approval, record that exact decision using `kh upload approve --id ID --hash REVIEW_HASH`, then run `kh upload send --id ID`. It verifies the server receipt by read-back and returns the real private URL. Open that URL; if any step fails, retain the candidate and identify the pending step. Old approved-local decisions require a fresh account-bound review.
Generate `kh schedule-prompt`, register it using the agent's native scheduler at the user's chosen cadence, and read back registration and next run/expiry. The local CLI will still report not-registered because it has no native scheduler integration; the native scheduler is the evidence. End with precise status: source verified, first candidate reviewed, server result, and next check-in. A failed step should have a recovery action, not a generic setup-complete message.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.

- [Connected API and review flow](references/server-contract.md): read for account connection, reviewed uploads, read-back and recovery.
