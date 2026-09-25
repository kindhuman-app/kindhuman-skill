# Agent adapters

Codex and Muse Code discover `.agents/skills`; Cursor also supports that directory. `kh install --agent all` uses one shared root to avoid duplicate names. Cursor-only installation uses `.cursor/skills`. `--global` uses the user's home; otherwise `--project PATH` selects a project. A filesystem install does not register an automation.

Codex: use the native scheduled-task tool/UI available in the current app after the user chooses cadence and timezone. In a continuing setup task, prefer a task-attached recurring check-in. Preserve the explicit request to prompt on every run; do not add a quiet-on-empty rule. Read back the schedule and next run. Local sources require the host and project to be available. CLI-only environments must not claim the desktop scheduler exists.

Cursor: use its native `/automate` workflow or Automations UI where available. Verify the execution location and a real source read there. Remote runs cannot assume access to local folders. Cursor's documented personal Cloud Agent sync is for `~/.cursor/skills`, not `~/.agents/skills`; use Cursor-specific install plus explicit sync when needed, and keep private inbox data outside the synced skills. Record schedule registration separately from local configuration.

Muse Code: `/loop` supports intervals and five-field cron in local time. Always supply the user's cadence; never accept its implicit default. Verify local timezone agrees with the user's choice. Documented recurring jobs expire after seven days and skip occurrences during an active run. Read back the job and expiry, explain renewal, and test delivery; do not claim permanent unattended service or silently install an OS scheduler. `muse skills list` and `muse skills validate PATH` provide native discovery/validation checks.

Source connector capabilities vary by host. List only tools actually callable there; test one selected item. A named connector, installed skill, or saved source configuration alone is not a working connection.

Official sources checked 2026-09-25:
- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/automations?surface=app
- https://cursor.com/docs/context/skills
- https://cursor.com/changelog/03-05-26
- https://dev.meta.ai/docs/muse-code/extending
- https://dev.meta.ai/docs/muse-code/interactive
