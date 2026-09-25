import fs from "node:fs";
import path from "node:path";
import { fingerprint, identity, request } from "./server.mjs";

// Timestamps are assigned by the service, never part of the person's wording.
export function meaning(document) {
  if (
    document?.version !== 1 ||
    typeof document.communicationStyle !== "string" ||
    !Array.isArray(document.nodes)
  )
    throw new Error(
      "Use a version 1 profile with communicationStyle and nodes.",
    );
  return {
    version: 1,
    communicationStyle: document.communicationStyle,
    nodes: document.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      meaning: n.meaning,
      state: n.state,
      origin: n.origin,
      momentIds: n.momentIds,
      valueIds: n.valueIds,
    })),
  };
}
export async function profileCommand({
  action,
  flags,
  home,
  c,
  need,
  safeId,
  readJSON,
  writeJSON,
  output,
}) {
  const file = path.join(home, "profile.json"),
    reviewFile = path.join(home, "profile-review.json");
  if (action === "init") {
    if (fs.existsSync(file))
      throw new Error("Your local profile already exists; edit it in place.");
    writeJSON(file, {
      version: 1,
      communicationStyle: c.style || "",
      nodes: [],
    });
    return output({
      file,
      uploaded: false,
      next: "Edit this local file with the person. Keep inferred items proposed until reviewed. No account is needed.",
    });
  }
  if (action === "show")
    return output({ file, document: readJSON(file), uploaded: false });
  if (!["preview", "approve", "send"].includes(action))
    throw new Error("Use profile init, show, preview, approve or send.");
  const local = readJSON(file),
    draftHash = fingerprint(local);
  if (
    Object.keys(local).some(
      (k) => !["version", "communicationStyle", "nodes"].includes(k),
    ) ||
    !Array.isArray(local.nodes) ||
    local.nodes.some(
      (n) =>
        !n ||
        Object.keys(n).some(
          (k) =>
            ![
              "id",
              "kind",
              "label",
              "meaning",
              "state",
              "origin",
              "momentIds",
              "localMomentIds",
              "valueIds",
              "createdAt",
              "updatedAt",
            ].includes(k),
        ) ||
        !Array.isArray(n.momentIds) ||
        !Array.isArray(n.valueIds) ||
        (n.localMomentIds !== undefined && !Array.isArray(n.localMomentIds)),
    )
  )
    throw new Error(
      "Unexpected profile fields or references. Use the documented profile schema; no fields will be silently omitted.",
    );
  // Local capture IDs become server IDs only from this destination's verified receipts.
  const resolved = {
    ...local,
    nodes: local.nodes?.map((node) => {
      const momentIds = [...(node.momentIds || [])];
      for (const id of node.localMomentIds || []) {
        const record = readJSON(path.join(home, "inbox", safeId(id) + ".json"));
        const upload = record.upload;
        if (
          upload?.state !== "synced" ||
          upload.server !== c.connection?.server ||
          upload.envelope?.review?.accountId !== c.connection?.accountId ||
          !upload.recordId
        )
          throw new Error(
            "Upload and verify each supporting Moment for this account before reviewing the profile.",
          );
        momentIds.push(upload.recordId);
      }
      return { ...node, momentIds: [...new Set(momentIds)] };
    }),
  };
  const document = meaning(resolved);
  if (document.nodes.some((n) => !["accepted", "rejected"].includes(n.state)))
    throw new Error(
      "Review each proposed item with the person before previewing an upload.",
    );
  await identity(c);
  const server = c.connection.server,
    accountId = c.connection.accountId;
  const remote = await request(server, "/api/v1/identity").catch((error) => {
    if (error.message.includes("HTTP 403"))
      throw new Error(
        "This connection has Moments-only access. In account setup, create a connection with optional reviewed-profile access, then reconnect. Your local draft is safe.",
      );
    if (error.message.includes("HTTP 404"))
      throw new Error(
        "This deployment does not support profile upload yet. Keep the local draft and use the private web profile editor until the app is updated.",
      );
    throw error;
  });
  if (remote.ownerId !== accountId || !Number.isSafeInteger(remote.revision))
    throw new Error(
      "Unexpected profile owner or revision. Nothing was uploaded.",
    );
  const finish = (state) => {
    const receipt = {
      ...state,
      state: "synced",
      verifiedAt: new Date().toISOString(),
      revision: remote.revision,
      url: server + "/app/identity",
    };
    writeJSON(reviewFile, receipt);
    return output({
      file,
      state: "synced",
      revision: receipt.revision,
      url: receipt.url,
      verifiedAt: receipt.verifiedAt,
    });
  };
  if (action === "send") {
    const state = readJSON(reviewFile);
    if (
      !["approved", "awaiting-confirmation", "synced"].includes(state.state) ||
      state.server !== server ||
      state.accountId !== accountId ||
      state.draftHash !== draftHash ||
      fingerprint(state.document) !== fingerprint(document) ||
      state.reviewHash !==
        fingerprint({
          server,
          accountId,
          revision: state.baseRevision,
          document,
          draftHash,
        })
    )
      throw new Error(
        "No valid approval for this draft and destination. Preview and review again.",
      );
    if (
      ["awaiting-confirmation", "synced"].includes(state.state) &&
      remote.revision === state.baseRevision + 1 &&
      fingerprint(meaning(remote.document)) === fingerprint(document)
    )
      return finish(state);
    if (remote.revision !== state.baseRevision)
      throw new Error(
        "Your online profile changed. Preview the latest version and review again; the local draft is preserved.",
      );
    state.state = "awaiting-confirmation";
    writeJSON(reviewFile, state);
    await request(server, "/api/v1/identity", {
      accountId,
      reviewed: true,
      revision: state.baseRevision,
      document,
      reviewHash: fingerprint({
        accountId,
        revision: state.baseRevision,
        document,
      }),
    });
    const verified = await request(server, "/api/v1/identity");
    if (
      verified.ownerId !== accountId ||
      verified.revision !== state.baseRevision + 1 ||
      fingerprint(meaning(verified.document)) !== fingerprint(document)
    )
      throw new Error(
        "Profile read-back did not match. Keep the local draft; inspect the online profile before another attempt.",
      );
    remote.revision = verified.revision;
    return finish(state);
  }
  const reviewHash = fingerprint({
    server,
    accountId,
    revision: remote.revision,
    document,
    draftHash,
  });
  const preview = {
    server,
    accountId,
    revision: remote.revision,
    previous: remote.document,
    document,
    removedIds: remote.document.nodes
      .filter((n) => !document.nodes.some((v) => v.id === n.id))
      .map((n) => n.id),
    reviewHash,
    uploaded: false,
  };
  if (action === "preview") return output(preview);
  if (need(flags, "hash") !== reviewHash)
    throw new Error(
      "The draft, destination or online profile changed. Show a fresh preview and obtain approval again.",
    );
  writeJSON(reviewFile, {
    server,
    accountId,
    baseRevision: remote.revision,
    document,
    draftHash,
    reviewHash,
    state: "approved",
    approvedAt: new Date().toISOString(),
  });
  return output({
    state: "approved",
    uploaded: false,
    next: "Only profile send uploads this reviewed profile.",
  });
}
