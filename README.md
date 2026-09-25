# KindHuman skills

Turn selected conversations, reading and transcripts into a continuing practice: gather locally, ask a thoughtful question, review, then preserve what matters.

For **Codex, Cursor and Meta Muse Code**. Each person chooses sources, boundaries, cadence, timezone and interaction style during setup. The recommended default is an **Inquisitive companion**: warm, curious, practical and gently helpful. Every scheduled check-in offers an invitation, including when no new material arrives. **Nothing is uploaded to KindHuman before the person reviews it.**

Licensed under the [Apache License 2.0](LICENSE). By contributing, you agree your contributions are licensed the same way.

## Try it in five minutes

Requires Node.js 20+ (`node --version`). No account, no build step.

```sh
git clone https://github.com/kindhuman-app/kindhuman-skill.git
cd kindhuman-skill
node bin/kh.mjs install --agent all --global --dry-run   # preview where skills land
node bin/kh.mjs install --agent all --global             # one shared directory every host discovers
```

Then ask your agent: **“Use kindhuman-start to set me up.”** Keep your first run local: choose a few lines of a real conversation, review the local draft, and stop before any account step.

Host support today: install paths are documented for all three hosts, but **in-host discovery is still unverified** — if your agent cannot see the skill, tell it the install directory (below) and report what was missing. Cursor Cloud Agent runs need the Cursor-specific install plus explicit skill sync; local installation alone is insufficient there.

## Install

Prefer the five-minute path above, which skips global installation. Or install the `kh` command globally (still requires this clone for reinstalls):

```sh
npm install --global .
kh install --agent all --global
```

`all` uses the shared `.agents/skills` directory every host discovers (`~/.agents/skills` with `--global`). `--agent cursor` uses `.cursor/skills`; Codex and Muse use `.agents/skills`. Choose one installation strategy per location to avoid duplicate skill names. Existing skill folders are never overwritten: reinstalling over them fails instead, so review updates separately.

Every install stamps a `.kindhuman-install.json` marker with the skill version. `kh status` reports installed copies and warns when they are stale. To update: `kh uninstall` then `kh install` again — updates are never silent, and your private inbox data is never touched by either command.

For one project or a preview:

```sh
kh install --agent all --project /absolute/path/to/project --dry-run
kh install --agent all --project /absolute/path/to/project
```

Without global CLI installation, run `node /absolute/path/to/kindhuman-skill/bin/kh.mjs` instead of `kh`. Keep that clone available. Skills are installed as copies; updating the clone does not silently update installed copies. Review changes and move existing skill folders aside before reinstalling. Do not delete personal inbox data when updating skills.

## What works in 0.2.0

- Nine portable skills with source, review and agent-specific guidance.
- A dependency-free Node CLI that installs skills, configures a private local inbox, collects selected text/transcript files, deduplicates captures and records exact-content review decisions. Installs are version-stamped (`kh status` warns about stale copies); `kh uninstall` removes skill copies only, never inbox data.
- Source pause/resume, collection health, a schedule prompt and empty-inbox reflection invitation.
- Account connection via per-agent tokens, exact account-bound upload review, private text uploads, retry deduplication and verified read-back URLs.

**Not implemented in the CLI:** OAuth device login, remote-source connector clients, native scheduler registration, binary uploads, Snapshot creation, record editing or publication. Use the app for reviewed editing, Snapshots and sharing. Connect only to a deployment serving the new agent API.

## Install

Requires Node.js 20+. This repository is public under the [Apache License 2.0](LICENSE).

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
kh init --timezone Australia/Melbourne --rhythm "Weekdays at 19:30" --style "Inquisitive companion" --lens "self-reflection"
kh source add --id journal --kind file --locator /absolute/path/to/journal.txt --scope "Only this selected file, including its current contents"
kh collect --source journal
kh check-in
kh inbox list
kh inbox show --id ITEM_ID
```

For a connected save, create an agent token in the app's `/app/setup` and provide `KH_TOKEN` through your credential manager (never paste it into chat, command arguments or Git). Connect before asking for upload approval so the person reviews the account and payload together:

```sh
kh account connect --server https://YOUR_KINDHUMAN_HOST
kh account status
kh upload preview --id ITEM_ID
# Show the exact preview and destination, then obtain human approval.
kh upload approve --id ITEM_ID --hash REVIEW_HASH
kh upload send --id ITEM_ID
```

`send` verifies the saved record and returns its real private URL. The local inbox folder is editable: use `kh edit --id ITEM_ID --file EDITED_WORDS.txt` to change proposed display words while preserving the exact original. Run `kh schedule-prompt` to prepare the chosen follow-up and `kh status` to inspect local state. Q&A is optional and user-triggered. Retry the same item after uncertain delivery. Changed content or accounts require another review. Read [the connected API guide](docs/server-contract.md) for token handling, limits and recovery. The scheduler prompt must be registered through the agent's real native tools at the user's chosen time; printing it does not schedule a run.

For an offline-only decision, `kh review --id ITEM_ID --digest DIGEST --decision approve|dismiss` preserves a local review. Such an approval needs a fresh destination-bound review before server upload.

Default state is `~/.kindhuman`; choose a different private directory with `KH_HOME` or `--home`. State files contain personal text. Keep them outside Git, synced skills and public directories. Local permissions are not encryption. Agent processing may still use the user's model provider; the guarantee is no upload to **KindHuman** before review. Only explicit reviewed `upload send` and `profile send` commands send capture or profile content to KindHuman. Account and read commands use authenticated HTTPS. The token is never persisted by the CLI.

## Your editable local profile

`kh profile init` creates `profile.json` in your private home without an account.
Your agent helps you shape values and islands there in your own words. When ready,
use `profile preview`, approve its exact hash, then `profile send`. Select optional
profile access when creating your agent connection. Supporting Moments must already
be uploaded. See the [profile contract](docs/server-contract.md#reviewed-values-islands-and-communication-style)
for the editable format and conflict recovery. The CLI keeps your local draft and
confirms the saved profile before returning its private URL.

## Skill catalogue

| Skill | Status | Purpose |
|---|---|---|
| `kindhuman-start` | Stable | Setup and immediate first capture, inquiry and review |
| `kindhuman-sources` | Stable | Source selection, access checks and recovery |
| `kindhuman-check-in` | Stable | Scheduled collection and a useful invitation |
| `kindhuman-capture` | Stable | Preserve original material in the local inbox |
| `kindhuman-reflect` | Stable | Explore meaning and source-supported connections |
| `kindhuman-moments` | Stable | Review and preserve exact approved material |
| `kindhuman-snapshots` | Preview | Propose dated selections of approved Moments (local proposal only; no CLI snapshot command yet) |
| `kindhuman-share` | Preview | Review what becomes visible to others (no CLI publish operation; never claims local approval made anything public) |
| `kindhuman-status` | Stable | Distinguish configuration from actual working delivery |

Preview skills are usable vocabulary whose product mechanism is still undecided; treat their flows as proposals, not promises.

## Design and implementation

- [Product flow](docs/product-flow.md)
- [Source connections and limits](docs/sources.md)
- [Codex, Cursor and Muse adapters](docs/agents.md)
- [Architecture audit and hosting options](docs/architecture.md)
- [Connected server API contract](docs/server-contract.md)
- [Delivery plan and acceptance scenarios](docs/roadmap.md)

Run `npm test` and `npm run check`. Tests use isolated temporary folders and do not connect to personal sources or KindHuman servers. The connected CLI also has a real-server verification script, run by the app integration suite against two synthetic accounts. Native agent discovery and scheduling still need verification in each target product.

## Troubleshooting

- **Agent cannot see the skill:** confirm the install directory exists (`~/.agents/skills/kindhuman-start/SKILL.md` for shared installs) and ask the agent to list its skills. In-host discovery is still unverified; report the host, version and what was missing.
- **`Already exists` on install:** the installer never overwrites. Run `kh uninstall --agent all --global` (or `--project PATH`) to remove the stamped copies, inspect the diff, then install again. Uninstall never touches inbox data.
- **`kh status` warns copies are stale:** same fix — uninstall, pull the latest clone, reinstall. Installed copies do not update themselves.
- **No install found, but `kindhuman-*` folders exist:** they predate version stamping or came from elsewhere. Back them up, remove them manually, then install cleanly. `kh uninstall` refuses to touch unstamped directories.
- **Cursor Cloud Agent:** local installation is insufficient; configure skill sync for `~/.cursor/skills` explicitly and verify source access at the execution location.
