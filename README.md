# KindHuman skills

Turn selected conversations, reading and transcripts into a continuing practice: gather locally, ask a thoughtful question, review, then preserve what matters.

For **Codex, Cursor and Meta Muse Code**. Each person chooses sources, boundaries, cadence and timezone during setup. Every scheduled check-in offers an invitation, including when no new material arrives. **Nothing is uploaded to KindHuman before the person reviews it.**

## What works in 0.1.0

- Nine portable skills with source, review and agent-specific guidance.
- A dependency-free Node CLI that installs skills, configures a private local inbox, collects selected text/transcript files, deduplicates captures and records exact-content review decisions.
- Source pause/resume, collection health, a schedule prompt and empty-inbox reflection invitation.

**Not implemented:** KindHuman account login, server uploads, live memory lanes for new users, remote-source connector clients, native scheduler registration, Snapshot persistence or publication. Their workflows and required server contract are documented; they are not simulated. This is a usable local foundation, not a completed multi-tenant launch.

## Install

Requires Node.js 20+. This repository is currently private; GitHub access is required. The package is not published to npm.

```sh
git clone https://github.com/kindhuman-app/kindhuman-skill.git
cd kindhuman-skill
npm install --global .
kh install --agent all --global
```

Then ask your agent: **“Use kindhuman-start to set me up.”**

For one project or a preview:

```sh
kh install --agent all --project /absolute/path/to/project --dry-run
kh install --agent all --project /absolute/path/to/project
```

`all` uses the shared `.agents/skills` directory. `--agent cursor` uses `.cursor/skills`; Codex and Muse use `.agents/skills`. Choose one installation strategy per location to avoid duplicate skill names. Existing skill folders are never overwritten. Cursor Cloud Agent use requires separately configuring skill sync and source access; local installation alone is insufficient.

Without global CLI installation, run `node /absolute/path/to/kindhuman-skill/bin/kh.mjs` instead of `kh`. Keep that clone available. Skills are installed as copies; updating the clone does not silently update installed copies. Review changes and move existing skill folders aside before reinstalling. Do not delete personal inbox data when updating skills.

## First local capture

The examples below use a sample cadence. Ask the person for their actual choice; do not impose the example.

```sh
kh init --timezone Australia/Melbourne --rhythm "Weekdays at 19:30"
kh source add --id journal --kind file --locator /absolute/path/to/journal.txt --scope "Only this selected file, including its current contents"
kh collect --source journal
kh check-in
kh inbox list
kh inbox show --id ITEM_ID
```

Show the person the exact content and provenance. Only after their decision:

```sh
kh review --id ITEM_ID --digest DIGEST_FROM_SHOW --decision approve
kh schedule-prompt
kh status
```

Approval is local and does not upload anything. A changed payload requires another review. The scheduler prompt must be registered through the agent's real native tools at the user's chosen time; printing it does not schedule a run.

Default state is `~/.kindhuman`; choose a different private directory with `KH_HOME` or `--home`. State files contain personal text. Keep them outside Git, synced skills and public directories. Local permissions are not encryption. Agent processing may still use the user's model provider; the guarantee is no upload to **KindHuman** before review. This CLI has no network transport.

## Skill catalogue

| Skill | Purpose |
|---|---|
| `kindhuman-start` | Setup and immediate first capture, inquiry and review |
| `kindhuman-sources` | Source selection, access checks and recovery |
| `kindhuman-check-in` | Scheduled collection and a useful invitation |
| `kindhuman-capture` | Preserve original material in the local inbox |
| `kindhuman-reflect` | Explore meaning and source-supported connections |
| `kindhuman-moments` | Review and preserve exact approved material |
| `kindhuman-snapshots` | Propose dated selections of approved Moments |
| `kindhuman-share` | Review what becomes visible to others |
| `kindhuman-status` | Distinguish configuration from actual working delivery |

## Design and implementation

- [Product flow](docs/product-flow.md)
- [Source connections and limits](docs/sources.md)
- [Codex, Cursor and Muse adapters](docs/agents.md)
- [Architecture audit and hosting options](docs/architecture.md)
- [Proposed server API contract](docs/server-contract.md)
- [Delivery plan and acceptance scenarios](docs/roadmap.md)

Run `npm test` and `npm run check`. Tests use isolated temporary folders and do not connect to personal sources or KindHuman servers. Native agent discovery, scheduling and server integration still need end-to-end verification in each target product.

This repository does not currently grant an open-source license. Choose licensing and public visibility before distributing it openly.
