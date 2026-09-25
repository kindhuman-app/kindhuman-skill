---
name: kindhuman-start
description: "Set up KindHuman in an agent, choose sources and a check-in schedule, and experience the first capture and review immediately."
---

# kindhuman-start

Read the operating contract, agent adapter, and source guide below. Start with three connected decisions: sources and their boundaries; the user's cadence/timezone; and their KindHuman account when server authentication is available. Upload policy is review-first, already settled.

Use `kh init --timezone ZONE --rhythm "CHOSEN RHYTHM"`. Do not set a default cadence or overwrite an existing configuration. Register and verify one source, collect a real item now, and ask one grounded reflection question. If there is no item, invite the person to share something that stayed with them today. Do not postpone all value until a timer fires.

Present the exact proposed Moment, original attribution, and private-upload destination for review. Preserve the answer locally with the correct digest. When a real server adapter exists, upload only that reviewed payload and read it back under the authenticated account, then open its private lane. In v0.1, clearly report the pending server step; never fabricate a live URL.

Generate `kh schedule-prompt`, register it using the agent's native scheduler at the user's chosen cadence, and read back registration and next run/expiry. The local CLI will still report not-registered because it has no native scheduler integration; the native scheduler is the evidence. End with precise status: source verified, first candidate reviewed, server result, and next check-in. A failed step should have a recovery action, not a generic setup-complete message.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.
