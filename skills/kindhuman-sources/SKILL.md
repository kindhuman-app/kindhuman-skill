---
name: kindhuman-sources
description: "Connect and manage the user-selected conversations, reading, text and transcripts that feed KindHuman check-ins."
---

# kindhuman-sources

Read the source guide and adapter guide. Inventory available host connectors before suggesting a connection. Ask for a precise scope and history boundary; reuse existing choices. Test a single selected item in the actual execution environment.

Use `kh source add` for a new explicit selection and `kh source list` to inspect existing configuration. For file/folder sources use `kh collect`; for remote sources use a callable agent tool and capture the selected result locally. Registering a URL is not a web subscription. Do not report connected until a real read succeeds.

Show a concise source card: what is included, where collection runs, last success, and any action needed. Do not place OAuth tokens in locator/scope fields. Use `kh source pause --id ID` or `kh source resume --id ID` for local collection control. For changes or credential revocation not supported by the CLI, explain the exact limitation and use the connector's native controls; do not keep reading a paused source.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.
