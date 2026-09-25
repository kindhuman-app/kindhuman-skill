---
name: kindhuman-status
description: "Diagnose KindHuman installation, source access, local inbox, review state, schedule delivery and server readiness without conflating configuration with success."
---

# kindhuman-status

Read the contract and adapter guide. Run `kh status` for local state and `kh account status` for live identity and server preferences, then check the relevant native agent surfaces. Distinguish skill files installed, skill discovered, source configured, source read, schedule registered, schedule delivered, review recorded, upload acknowledged, and live page verified.

Do not report an empty inbox when a connector failed. Show the first actionable failure and a concrete next step. The CLI's schedule state remains not-registered until a native adapter exists; use native tool evidence separately. Approved-local items are not synced.

For a held inbox lock, establish that no process is writing before proposing removal; do not delete it blindly. For an unavailable server, retain local records and explain that upload remains pending. Never print tokens or source text in broad diagnostics. No automatic destructive cleanup or config overwrite.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.

- [Connected API and review flow](references/server-contract.md): read for account connection, reviewed uploads, read-back and recovery.
