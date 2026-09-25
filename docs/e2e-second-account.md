# Second-account end-to-end test

Use this runbook to test the complete review-first flow with a fresh KindHuman
account. It keeps the skill state in a disposable directory and uses one
selected text excerpt. Do not point `KH_HOME` at an existing personal archive.

## 1. Install the skill in a clean project

```sh
git clone https://github.com/kindhuman-app/kindhuman-skill.git
cd kindhuman-skill
npm install
node bin/kh.mjs install --agent all --project /absolute/path/to/test-project
```

For an already cloned checkout, run the install command from that checkout. The
installer refuses to overwrite an existing skill folder, which protects a
project's local agent instructions.

## 2. Start accountless and capture one selected excerpt

```sh
export KH_HOME=/absolute/path/to/private-test-home

kh init \
  --timezone Australia/Melbourne \
  --rhythm "Weekdays at 19:30" \
  --style "Inquisitive companion" \
  --lens "self-reflection"

kh source add \
  --id selected-conversation \
  --kind conversation \
  --locator "local-agent-selection" \
  --scope "Only the excerpt selected from this conversation"

kh capture \
  --source selected-conversation \
  --file /absolute/path/to/selected-excerpt.txt \
  --origin "codex://selected-excerpt/test-account"

kh check-in
kh inbox list
kh inbox show --id ITEM_ID
```

Confirm that the check-in always contains an invitation and that `inbox show`
contains the exact original text. At this point the server must have received
nothing.

## 3. Edit and review locally

```sh
kh edit --id ITEM_ID --file /absolute/path/to/edited-display-words.txt
kh inbox show --id ITEM_ID
```

Review the output with the person. The edited `displayWords` may change, but
`originalText` must remain intact. Do not use the local `review approve` command
as a substitute for account-bound upload review.

## 4. Create the fresh account in the web app

1. Open [KindHuman account setup](https://app.kindhuman.app/login?callbackUrl=%2Fapp%2Fsetup).
2. Sign in with the separate GitHub or Google identity used for this test.
3. In `/app/setup`, set a unique display name and handle. Keep the profile
   private for the P0 test.
4. Set the test check-in rhythm and timezone.
5. Create an agent connection named for the test machine and agent, such as
   `Second-account Codex smoke test`.
6. Copy the one-time key directly into the agent credential mechanism. Do not
   put it in a shell history, source file, skill folder or chat transcript.
7. Add the source that matches the local source scope. Use `conversation`,
   `paste`, `file` or `transcript` as appropriate and select the agent that
   will read it.

The account is connected only when the CLI can read `/api/v1/me` and the
response contains the expected account handle, private path and review-first
upload policy.

## 5. Connect and upload the reviewed Moment

```sh
kh account connect --server https://app.kindhuman.app
kh account status
kh upload preview --id ITEM_ID
```

Check every preview field: account handle, source provenance, original words,
edited display words, private destination and review hash. Only after the person
approves that exact preview:

```sh
kh upload approve --id ITEM_ID --hash REVIEW_HASH
kh upload send --id ITEM_ID
kh moments list
kh moments show --id SERVER_MOMENT_ID
```

The final read-back should show the Moment under the new account's private
`/app/moments/...` path. The same capture can be retried after an uncertain
network result; a changed account or payload requires a new preview and review.

## 6. Verify privacy and the living page

- Open the private Moments page while signed in and confirm the Moment is
  visible.
- Open the public lane `/u/HANDLE` in a signed-out window. It should not expose
  a private Moment while the profile and page remain private.
- Do not enable public visibility as part of the P0 upload test. Run sharing as
  a separate explicit test.
- Revoke the agent connection in `/app/setup`, then confirm `kh account status`
  fails and no subsequent upload is accepted.

## Pass criteria

| Stage | Expected result |
|---|---|
| Install | Fresh agent skill folders created; existing folders are never overwritten |
| Local capture | One selected text excerpt in local inbox; no KindHuman upload |
| Edit | Original preserved; display wording editable |
| Account | New tenant has its own handle, sources and agent grant |
| Review | Preview is account-bound and hash-bound |
| Upload | One private Moment is written and read back under the new tenant |
| Privacy | Signed-out public lane does not reveal the private Moment |
| Revoke | Revoked grant cannot read or write through the agent API |
