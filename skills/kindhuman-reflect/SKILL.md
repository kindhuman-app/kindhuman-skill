---
name: kindhuman-reflect
description: "Help a person reflect on a captured KindHuman item and explore source-supported connections without turning AI suggestions into personal facts."
---

# kindhuman-reflect

Read the contract. Inspect the original candidate and attribution. Offer a short, tentative observation and one optional question, using the person's vocabulary. Avoid diagnoses, manufactured emotions and forced lessons.

Connections require two real accessible records and a concrete explanation grounded in them. Label a connection as suggested until the person accepts it. A reading excerpt remains attributed to its author even when the person reflects on it.

Keep the person's reply verbatim and AI interpretation separately labeled in a local proposal. The current CLI does not edit reflection fields: capture the reply as a new local item with a reference to the original rather than pretending to mutate the server. Before upload, show the exact combined proposal and obtain its own review; an approval of the original does not cover new interpretations.

## References

- [Operating contract](references/contract.md): read before acting.
- [Source connections](references/sources.md): read when gathering or configuring sources.
- [Agent adapters](references/agents.md): read for setup, scheduling, installation or delivery diagnosis.

- [Connected API and review flow](references/server-contract.md): read for account connection, reviewed uploads, read-back and recovery.
