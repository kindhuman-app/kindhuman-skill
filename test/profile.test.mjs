import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const cli = fileURLToPath(new URL("../bin/kh.mjs", import.meta.url));
test("profile remains local until exact approval, recovers uncertain writes and refuses changed destinations", async (t) => {
  const dir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kh-profile-test-")),
    ),
    home = path.join(dir, "state");
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let account = "a",
    revision = 0,
    remote = { version: 1, communicationStyle: "", nodes: [] },
    posts = 0,
    requests = 0,
    mode = "normal";
  const server = http.createServer(async (req, res) => {
    requests++;
    const send = (x) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(x));
    };
    if (req.url === "/api/v1/me")
      return send({ accountId: account, uploadPolicy: "review-first" });
    if (req.url !== "/api/v1/identity") {
      res.statusCode = 404;
      return send({});
    }
    if (mode === "forbidden") {
      res.statusCode = 403;
      return send({});
    }
    if (req.method === "GET")
      return send({ ownerId: account, revision, document: remote });
    posts++;
    let raw = "";
    for await (const p of req) raw += p;
    const body = JSON.parse(raw);
    assert.equal(body.accountId, account);
    assert.equal(body.revision, revision);
    revision++;
    remote = body.document;
    if (mode === "uncertain") {
      req.socket.destroy();
      return;
    }
    if (mode === "bad-readback")
      remote = { ...remote, communicationStyle: "Unexpected words" };
    return send({ ownerId: account, revision, document: remote });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function call(...args) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, ...args], {
        env: {
          ...process.env,
          KH_HOME: home,
          KH_TOKEN: "kh_" + "x".repeat(43),
        },
      });
      let out = "",
        err = "";
      child.stdout.on("data", (x) => (out += x));
      child.stderr.on("data", (x) => (err += x));
      child.on("error", reject);
      child.on("exit", (status) => resolve({ status, out, err }));
    });
  }
  async function run(...args) {
    const r = await call(...args);
    assert.equal(r.status, 0, r.err);
    return JSON.parse(r.out);
  }
  await run("init", "--timezone", "UTC", "--rhythm", "on demand");
  await run("profile", "init");
  const file = path.join(home, "profile.json");
  const doc = {
    version: 1,
    communicationStyle: "Ask gently.\nOne question.",
    nodes: [
      {
        id: "care",
        kind: "value",
        label: "Make room",
        meaning: "An extra chair",
        state: "accepted",
        origin: "agent",
        momentIds: [],
        localMomentIds: ["capture-1"],
        valueIds: [],
      },
    ],
  };
  fs.writeFileSync(file, JSON.stringify(doc));
  await run("profile", "show");
  assert.equal(requests, 0);
  fs.writeFileSync(
    file,
    JSON.stringify({ ...doc, unrecognizedMeaning: "Do not silently drop me" }),
  );
  assert.notEqual((await call("profile", "preview")).status, 0);
  assert.equal(requests, 0);
  fs.writeFileSync(file, JSON.stringify(doc));
  await run("account", "connect", "--server", origin);
  assert.notEqual((await call("profile", "preview")).status, 0);
  assert.equal(posts, 0);
  fs.mkdirSync(path.join(home, "inbox"));
  fs.writeFileSync(
    path.join(home, "inbox", "capture-1.json"),
    JSON.stringify({
      upload: {
        state: "synced",
        server: origin,
        recordId: "remote-1",
        envelope: { review: { accountId: "a" } },
      },
    }),
  );
  mode = "forbidden";
  assert.match((await call("profile", "preview")).err, /Moments-only access/);
  assert.equal(posts, 0);
  mode = "normal";
  const preview = await run("profile", "preview");
  assert.deepEqual(preview.document.nodes[0].momentIds, ["remote-1"]);
  assert.equal(posts, 0);
  await run("profile", "approve", "--hash", preview.reviewHash);
  assert.equal(posts, 0);
  const changed = { ...doc, communicationStyle: "Changed locally" };
  fs.writeFileSync(file, JSON.stringify(changed));
  assert.notEqual((await call("profile", "send")).status, 0);
  assert.equal(posts, 0);
  fs.writeFileSync(file, JSON.stringify(doc));
  mode = "uncertain";
  assert.notEqual((await call("profile", "send")).status, 0);
  assert.equal(posts, 1);
  mode = "normal";
  assert.equal((await run("profile", "send")).state, "synced");
  assert.equal(posts, 1);
  assert.equal((await run("profile", "send")).revision, 1);
  assert.equal(posts, 1);
  account = "b";
  assert.notEqual((await call("profile", "send")).status, 0);
  assert.equal(posts, 1);
  account = "a";
  // A newer web edit invalidates the old review and is displayed before approval.
  remote = {
    ...remote,
    nodes: [
      ...remote.nodes,
      { ...remote.nodes[0], id: "keep-rejection", state: "rejected" },
    ],
  };
  revision++;
  assert.notEqual((await call("profile", "send")).status, 0);
  const fresh = await run("profile", "preview");
  assert.deepEqual(fresh.removedIds, ["keep-rejection"]);
  assert.notEqual(
    (await call("profile", "approve", "--hash", preview.reviewHash)).status,
    0,
  );
  await run("profile", "approve", "--hash", fresh.reviewHash);
  mode = "bad-readback";
  assert.notEqual((await call("profile", "send")).status, 0);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(home, "profile-review.json"))).state,
    "awaiting-confirmation",
  );
  assert.equal(posts, 2);
  assert.equal(fs.readFileSync(file, "utf8"), JSON.stringify(doc));
});
