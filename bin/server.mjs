import { createHash } from 'node:crypto';
import path from 'node:path';

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
  const token = process.env.KH_TOKEN;
  if (!/^kh_[A-Za-z0-9_-]{43}$/.test(token || '')) throw new Error('Provide KH_TOKEN through your credential manager. Create an agent connection in /app/setup.');
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
  const payload = { words: r.originalText.trim(), originalWords: r.originalText, eventAt: r.eventAt, views: [], provenance: { kind, sourceRef: r.source.origin, author: null }, reflection: r.reflection };
  if (typeof payload.provenance.sourceRef !== 'string' || payload.provenance.sourceRef.length > 2000 || (payload.reflection?.length || 0) > 8000 || JSON.stringify(payload).length > 140000) throw new Error('Source reference or reflection exceeds the upload limit.');
  return payload;
}
export async function connectedCommand({command, action, flags, home, c, need, safeId, readJSON, writeJSON, output}) {
  if (command === 'account') {
    if (action === 'disconnect') { delete c.connection; writeJSON(path.join(home,'config.json'),c); return output({disconnected:true, tokenRevoked:false, next:'Revoke the token in /app/setup if no longer needed.'}); }
    if (action === 'connect') {
      const server = serverOrigin(need(flags,'server'));
      const me = await request(server, '/api/v1/me');
      if (typeof me.accountId !== 'string' || !me.accountId || me.uploadPolicy !== 'review-first') throw new Error('Server does not support the reviewed-upload contract.');
      c.connection = {server,accountId:me.accountId,handle:me.handle,lastVerifiedAt:new Date().toISOString()};
      writeJSON(path.join(home,'config.json'),c);
      return output({connection:c.connection, settings:me, next:'Preview an item with kh upload preview. Previous local approvals do not authorize server upload.'});
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
