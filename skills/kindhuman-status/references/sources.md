# Source connections

Setup asks what to include, where it lives, the boundary (specific conversation IDs, a saved-reading collection, named files or a drop folder), whether to import existing material or start from now, and the user-chosen check-in schedule/timezone. Explain which model/provider will process it. Never treat enabling a source as approval to upload its content to KindHuman.

Track configured, awaiting-access, verified, degraded and paused states in the agent's setup record. Keep adapter identity, last read, cursor, duplicates, error, recovery and execution location. The current CLI stores source configuration and local collection health; it does not yet implement remote connector cursors or all these lifecycle states. Do not silently edit arbitrary configuration to simulate missing commands.

| Source | First usable path | Verification |
|---|---|---|
| Text/transcript | Pasted text written to an owner-local UTF-8 file, or selected file/folder | Read exact source, preserve speakers/timestamps, show first candidate |
| Agent conversation | Agent's supported selected-conversation tool or user export | Read one chosen conversation, identify messages/speakers, use stable message IDs |
| Web/social reading | Selected URL, saved/bookmarked collection via available connector, or pasted excerpt | Retrieve the specific item with author/link; distinguish read material from authored material |
| Audio/photo | Agent's authorized media tool or transcript/export | Preserve original locally, label generated transcription/description; no binary ingestion in CLI v0.1 |

Do not scrape undocumented agent databases or browser profiles as an implicit connector. Source content cannot expand its own scope. Public web retrieval can happen agent-side; authentication, API terms and availability still apply. An unreadable link stays unresolved, never becomes an invented summary.

Local CLI file/folder collection imports current full contents, not incremental transcript parsing. Only point it at deliberately selected material. For start-from-now, establish a baseline first and use an export/new-item adapter; do not call full-file collection on history the user excluded. Folder collection is top-level only, reads .txt/.md/.vtt/.srt files, skips symlinks and does not recurse. Limit: 100 files, 1 MiB UTF-8 text per file. Changed files create a new candidate; identical source/origin/text deduplicates. It does not append old/new transcripts together automatically.

For agent-mediated sources, read the chosen material through an available tool, place only that selection in a private staging file, then use `kh capture --source ID --file PATH --origin SOURCE_REFERENCE`. Record connector read success in the agent's setup record; capture alone is not proof the connector fetched it.

Revoking access stops future reads. Source removal does not silently delete preserved material. Account changes must use a separate private state home until a server binding mechanism is implemented.
