import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Token resolution: KH_TOKEN from the host credential mechanism always wins.
// Otherwise the token approved in the person's browser (kh account connect)
// is read from KH_HOME/credentials.json, written with mode 0600.
const TOKEN = /^kh_[A-Za-z0-9_-]{43}$/;
let activeHome = null;
export function useHome(home) { activeHome = home; }
const credentialsPath = home => path.join(home, 'credentials.json');
export function storedCredentials(home) {
  try {
    const value = JSON.parse(fs.readFileSync(credentialsPath(home), 'utf8'));
    return TOKEN.test(value?.token || '') ? value : null;
  } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
function tokenValue() {
  if (TOKEN.test(process.env.KH_TOKEN || '')) return process.env.KH_TOKEN;
  const stored = activeHome && storedCredentials(activeHome);
  if (stored) return stored.token;
  throw new Error('No agent token. Run kh account connect --server https://YOUR_HOST and approve this agent in your signed-in browser, or provide KH_TOKEN through your credential manager.');
}

export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw new Error('Invalid reviewed payload');
}
export const fingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');
export function serverOrigin(value) {
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('Use the server origin only, without credentials, path or query.');
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))) throw new Error('Use HTTPS (HTTP is allowed only for local development).');
  return u.origin;
}
export async function request(server, route, body) {
  const token = tokenValue();
  let res;
  try {
    res = await fetch(serverOrigin(server) + route, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch { throw new Error('Server unavailable or request outcome uncertain. Keep the same capture ID and retry; no item was marked synced.'); }
  if (!res.ok) throw new Error(`KindHuman API HTTP ${res.status}. ${res.status === 401 ? 'Reconnect with an active agent token.' : res.status === 409 ? 'Content conflicts with a saved capture; inspect before retrying.' : 'Check the server and reviewed payload.'}`);
  try { return await res.json(); } catch { throw new Error('The server returned an invalid response; no item was marked synced.'); }
}
// Anonymous call used only by the browser-approval handoff.
async function anonymous(server, route, body) {
  let res;
  try {
    res = await fetch(serverOrigin(server) + route, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { throw new Error('Server unavailable while connecting. Check the server origin and retry.'); }
  let json = {};
  try { json = await res.json(); } catch { if (res.ok) throw new Error('The server returned an invalid response while connecting.'); }
  return { status: res.status, json };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Device-code style handoff: the person approves in their own signed-in browser.
// See the app's specs/kindhuman-v2/agent-handoff-contract.md.
export async function browserApproval(server, { name, profileAccess }, log = m => console.error(m)) {
  const start = await anonymous(server, '/api/v1/agent-connect', { name, profileAccess });
  if (start.status === 404) throw new Error('This server does not offer browser approval yet. Create a token in /app/setup and provide it as KH_TOKEN.');
  if (start.status !== 201) throw new Error(`Could not start the connection (HTTP ${start.status}). ${start.json.error || ''}`.trim());
  const { deviceCode, userCode, verificationUrl, interval, expiresAt } = start.json;
  if (!/^[A-Za-z0-9_-]{43}$/.test(deviceCode || '') || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode || '') || !verificationUrl) throw new Error('Unexpected connection start response.');
  log(`Open ${verificationUrl} in the browser where you are signed in to KindHuman and confirm code ${userCode}. Waiting up to ten minutes; press Ctrl-C to stop.`);
  const deadline = Math.min(Date.parse(expiresAt) || Infinity, Date.now() + 11 * 60 * 1000);
  const wait = Math.max(1, Number(interval) || 5) * 1000;
  while (Date.now() < deadline) {
    await sleep(wait);
    const poll = await anonymous(server, '/api/v1/agent-connect/token', { deviceCode });
    if (poll.status === 429) continue;
    if (poll.status === 410) throw new Error('This connection was already collected elsewhere. Start again.');
    if (poll.status !== 200) throw new Error(`Connection check failed (HTTP ${poll.status}). ${poll.json.error || ''}`.trim());
    const { status } = poll.json;
    if (status === 'pending') continue;
    if (status === 'denied') throw new Error('The connection was cancelled in the browser. Nothing was connected.');
    if (status === 'expired') throw new Error('The code expired before it was approved. Run account connect again for a fresh code.');
    if (status === 'approved' && TOKEN.test(poll.json.token || '')) return { token: poll.json.token, scopes: poll.json.scopes || [], name: poll.json.name || name, expiresAt: poll.json.expiresAt || null };
    throw new Error('Unexpected connection response.');
  }
  throw new Error('The code expired before it was approved. Run account connect again for a fresh code.');
}
export async function identity(c) {
  if (!c.connection) throw new Error('Run kh account connect --server https://YOUR_HOST first.');
  const me = await request(c.connection.server, '/api/v1/me');
  if (me.accountId !== c.connection.accountId) throw new Error('Account changed. Reconnect and review for the destination account before upload.');
  return me;
}
function payloadFor(r) {
  if (typeof r.originalText !== 'string' || !r.originalText.trim() || r.originalText.length > 20000) throw new Error('Select a non-empty excerpt of at most 20,000 characters before review.');
  if (r.reflection !== null && typeof r.reflection !== 'string') throw new Error('Reflection must be human-reviewed text or null.');
  const kind = ['folder', 'file'].includes(r.source.kind) ? 'file' : r.source.kind;
  if (!['conversation','web','paste','file','transcript','legacy'].includes(kind)) throw new Error('Unsupported source kind.');
  const payload = { words: (r.displayWords || r.originalText.trim()), originalWords: r.originalText, eventAt: r.eventAt, views: [], provenance: { kind, sourceRef: r.source.origin, author: null }, reflection: r.reflection };
  if (typeof payload.provenance.sourceRef !== 'string' || payload.provenance.sourceRef.length > 2000 || (payload.reflection?.length || 0) > 8000 || JSON.stringify(payload).length > 140000) throw new Error('Source reference or reflection exceeds the upload limit.');
  return payload;
}
export async function connectedCommand({command, action, flags, home, c, need, safeId, readJSON, writeJSON, output}) {
  useHome(home);
  if (command === 'account') {
    if (action === 'disconnect') {
      delete c.connection; writeJSON(path.join(home,'config.json'),c);
      let storedTokenRemoved = false;
      try { fs.unlinkSync(credentialsPath(home)); storedTokenRemoved = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
      return output({disconnected:true, storedTokenRemoved, tokenRevoked:false, next:'Revoke the connection in /app/setup if no longer needed.'});
    }
    if (action === 'connect') {
      const server = serverOrigin(need(flags,'server'));
      let via = 'KH_TOKEN', scopes = null;
      if (!TOKEN.test(process.env.KH_TOKEN || '')) {
        const stored = storedCredentials(home);
        if (stored && stored.server === server) via = 'stored-approval';
        else {
          const name = String(flags.name || `kh on ${os.hostname()}`).trim().slice(0, 100);
          const approval = await browserApproval(server, { name, profileAccess: flags.profile === true });
          writeJSON(credentialsPath(home), { server, token: approval.token, scopes: approval.scopes, name: approval.name, expiresAt: approval.expiresAt, obtainedAt: new Date().toISOString() });
          via = 'browser-approval'; scopes = approval.scopes;
        }
      }
      const me = await request(server, '/api/v1/me');
      if (typeof me.accountId !== 'string' || !me.accountId || me.uploadPolicy !== 'review-first') throw new Error('Server does not support the reviewed-upload contract.');
      c.connection = {server,accountId:me.accountId,handle:me.handle,via,lastVerifiedAt:new Date().toISOString()};
      writeJSON(path.join(home,'config.json'),c);
      return output({connection:c.connection, ...(scopes ? {scopes} : {}), settings:me, next:'Preview an item with kh upload preview. Previous local approvals do not authorize server upload.'});
    }
    if (action === 'status') return output({connection:c.connection,settings:await identity(c),verifiedAt:new Date().toISOString()});
    throw new Error('Use account connect, status or disconnect');
  }
  if (command === 'moments') {
    await identity(c);
    if (action === 'list') return output(await request(c.connection.server,'/api/v1/moments'));
    if (action === 'show') return output(await request(c.connection.server,'/api/v1/moments/'+safeId(need(flags,'id'))));
    throw new Error('Use moments list or show --id ID');
  }
  if (command !== 'upload' || !['preview','approve','send'].includes(action)) throw new Error('Use upload preview, approve or send --id ID');
  const p=path.join(home,'inbox',safeId(need(flags,'id'))+'.json'), r=readJSON(p);
  if(r.state === 'dismissed') throw new Error('This item was dismissed. Capture a new version if the user wants to keep it.');
  await identity(c);
  const payload=payloadFor(r), accountId=c.connection.accountId;
  const payloadHash=fingerprint({accountId,payload});
  // Bind the human decision to both account and server, not just content.
  const reviewHash=fingerprint({server:c.connection.server,accountId,payload});
  if(action === 'preview') return output({id:r.id,server:c.connection.server,accountId,payload,reviewHash,uploadPerformed:false});
  if(action === 'approve') {
    if(need(flags,'hash') !== reviewHash) throw new Error('Preview changed. Show the exact current preview and obtain a fresh decision.');
    r.upload={server:c.connection.server,reviewHash,envelope:{schemaVersion:1,clientCaptureId:r.id,review:{accountId,approvedAt:new Date().toISOString(),payloadHash},payload},state:'approved',receipt:null};
    writeJSON(p,r); return output({id:r.id,state:'approved-for-upload',uploaded:false});
  }
  if(!r.upload || r.upload.server !== c.connection.server || r.upload.reviewHash !== reviewHash || r.upload.envelope.review.accountId !== accountId || fingerprint({accountId,payload:r.upload.envelope.payload}) !== payloadHash || r.upload.envelope.review.payloadHash !== payloadHash || r.upload.envelope.clientCaptureId !== r.id) throw new Error('No valid account-bound approval. Preview and obtain review before uploading.');
  r.upload.state='awaiting-confirmation'; writeJSON(p,r);
  const saved=await request(c.connection.server,'/api/v1/moments',r.upload.envelope);
  if(!saved.record?.id || saved.receipt?.payloadHash !== payloadHash || saved.receipt?.clientCaptureId !== r.id) throw new Error('Unexpected upload receipt. Retain this item and retry the same ID.');
  const remoteId=safeId(saved.record.id);
  const verified=await request(c.connection.server,'/api/v1/moments/'+remoteId);
  if(verified.record?.id !== remoteId || verified.record.document?.originalWords !== payload.originalWords || !verified.receipts?.some(x=>x.clientCaptureId===r.id && x.payloadHash===payloadHash)) throw new Error('Read-back verification failed. Retain this item and retry the same ID.');
  const privatePath='/app/moments/'+remoteId;
  r.upload={...r.upload,state:'synced',recordId:remoteId,receipt:saved.receipt,verifiedAt:new Date().toISOString(),url:c.connection.server+privatePath};
  r.state='synced'; writeJSON(p,r);
  return output({id:r.id,state:'synced',recordId:remoteId,url:r.upload.url,verifiedAt:r.upload.verifiedAt});
}
