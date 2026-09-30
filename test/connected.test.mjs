import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonical, fingerprint, serverOrigin } from '../bin/server.mjs';
const cli=fileURLToPath(new URL('../bin/kh.mjs',import.meta.url));
test('canonical review hash is stable and transport refuses unsafe origins',()=>{
 assert.equal(canonical({z:[2,1],a:' x\n'}),'{"a":" x\\n","z":[2,1]}');
 assert.equal(fingerprint({b:1,a:2}),fingerprint({a:2,b:1}));
 assert.notEqual(fingerprint({accountId:'a',payload:'x'}),fingerprint({accountId:'b',payload:'x'}));
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/api','https://example.com?x=1']) assert.throws(()=>serverOrigin(url));
});
test('browser approval obtains, stores and uses a token; cancel, expiry and slow-down are honored',async t=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kh-handoff-test-'))),home=path.join(dir,'state');
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const token='kh_'+'t'.repeat(43), deviceCode='d'.repeat(43);
 let outcome='approved', starts=0, polls=0, released=0, meCalls=0, lastAuth=null, lastStart=null;
 const server=http.createServer(async(req,res)=>{
  const send=(x,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(x));};
  let raw='';for await(const part of req)raw+=part;
  if(req.url==='/api/v1/agent-connect'){
   starts++;lastStart=JSON.parse(raw);assert.equal(req.headers.authorization,undefined);
   return send({deviceCode,userCode:'ABCD-EFGH',verificationUrl:`http://127.0.0.1/app/connect?code=ABCD-EFGH`,expiresAt:new Date(Date.now()+600000).toISOString(),expiresIn:600,interval:0,scopes:['moments:read','moments:write']},201);
  }
  if(req.url==='/api/v1/agent-connect/token'){
   polls++;assert.equal(JSON.parse(raw).deviceCode,deviceCode);
   if(polls===1) return send({error:'Slow down.'},429);
   if(polls===2) return send({status:'pending',interval:0});
   if(outcome==='denied') return send({status:'denied'});
   if(outcome==='expired') return send({status:'expired'});
   if(released++) return send({error:'Already collected.'},410);
   return send({status:'approved',token,scopes:['moments:read','moments:write'],expiresAt:new Date(Date.now()+86400000).toISOString(),name:lastStart.name});
  }
  if(req.url==='/api/v1/me'){meCalls++;lastAuth=req.headers.authorization;return send({accountId:'approved-account',handle:'approved',uploadPolicy:'review-first'});}
  throw new Error('Unexpected request '+req.url);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function call(...args){return new Promise((resolve,reject)=>{
  const env={...process.env,KH_HOME:home};delete env.KH_TOKEN;
  const child=spawn(process.execPath,[cli,...args],{env});let stdout='',stderr='';
  child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',reject);child.on('exit',status=>resolve({status,stdout,stderr}));
 });}
 async function run(...args){const result=await call(...args);assert.equal(result.status,0,result.stderr);return {...JSON.parse(result.stdout),stderr:result.stderr};}
 await run('init','--timezone','UTC','--rhythm','chosen');
 // Without any token, status explains the browser path instead of demanding KH_TOKEN.
 const noToken=await call('account','status');assert.notEqual(noToken.status,0);assert.match(noToken.stderr,/kh account connect/);
 // Cancelled in the browser: nothing stored.
 outcome='denied';const denied=await call('account','connect','--server',origin,'--name','Test agent');
 assert.notEqual(denied.status,0);assert.match(denied.stderr,/ABCD-EFGH/);assert.match(denied.stderr,/cancelled/);assert.equal(fs.existsSync(path.join(home,'credentials.json')),false);
 // Expired before approval: nothing stored.
 polls=0;outcome='expired';const expired=await call('account','connect','--server',origin);
 assert.notEqual(expired.status,0);assert.match(expired.stderr,/expired/);assert.equal(fs.existsSync(path.join(home,'credentials.json')),false);
 // Approved: the token is stored privately, never printed, and /me is verified with it.
 polls=0;outcome='approved';const ok=await run('account','connect','--server',origin,'--name','Test agent','--profile');
 assert.equal(lastStart.name,'Test agent');assert.equal(lastStart.profileAccess,true);
 assert.match(ok.stderr,/http:\/\/127\.0\.0\.1\/app\/connect\?code=ABCD-EFGH/);
 assert.equal(ok.connection.accountId,'approved-account');assert.equal(ok.connection.via,'browser-approval');assert.deepEqual(ok.scopes,['moments:read','moments:write']);
 assert.doesNotMatch(JSON.stringify(ok),/kh_t{43}/);assert.equal(lastAuth,`Bearer ${token}`);
 const credentials=path.join(home,'credentials.json');
 assert.equal(fs.statSync(credentials).mode&0o777,0o600);assert.equal(JSON.parse(fs.readFileSync(credentials,'utf8')).token,token);
 // Later commands use the stored approval without KH_TOKEN; connect again reuses it without a new handoff.
 const status=await run('account','status');assert.equal(status.settings.accountId,'approved-account');
 const again=await run('account','connect','--server',origin);assert.equal(again.connection.via,'stored-approval');assert.equal(starts,3);
 // KH_TOKEN, when present, wins over the stored approval.
 const envToken='kh_'+'e'.repeat(43);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[cli,'account','status'],{env:{...process.env,KH_HOME:home,KH_TOKEN:envToken}});child.on('error',reject);child.on('exit',resolve);});
 assert.equal(lastAuth,`Bearer ${envToken}`);
 // Disconnect removes the stored approval and says the server-side grant is not revoked.
 const gone=await run('account','disconnect');assert.equal(gone.storedTokenRemoved,true);assert.equal(gone.tokenRevoked,false);assert.equal(fs.existsSync(credentials),false);
 assert.equal(meCalls>=3,true);
});
test('uncertain upload and failed read-back retain approval and retry the same capture',async t=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kh-network-test-'))),home=path.join(dir,'state');
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let mode='normal', saved=null, posts=0;
 const server=http.createServer(async(req,res)=>{
  const send=x=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(x));};
  if(req.url==='/api/v1/me') {
   if(mode==='redirect') {res.writeHead(302,{Location:'/stolen'});return res.end();}
   if(mode==='revoked') {res.writeHead(401);return res.end();}
   return send({accountId:'test-account',handle:'test',uploadPolicy:'review-first'});
  }
  if(req.method==='POST'){
   posts++;let raw='';for await(const part of req)raw+=part;
   const envelope=JSON.parse(raw);
   if(saved) assert.equal(envelope.clientCaptureId,saved.receipt.clientCaptureId);
   saved={record:{id:'remote-test-record',document:{originalWords:envelope.payload.originalWords}},receipt:{...envelope.review,clientCaptureId:envelope.clientCaptureId}};
   if(mode==='uncertain'){req.socket.destroy();return;}
   return send(saved);
  }
  if(req.url.startsWith('/api/v1/moments/')) return send({record:saved.record,receipts:mode==='bad-readback'?[]:[saved.receipt]});
  throw new Error('Unexpected request '+req.url);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function call(...args){return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[cli,...args],{env:{...process.env,KH_HOME:home,KH_TOKEN:'kh_'+'x'.repeat(43)}});let stdout='',stderr='';
  child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',reject);child.on('exit',status=>resolve({status,stdout,stderr}));
 });}
 async function run(...args){const result=await call(...args);assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
 await run('init','--timezone','UTC','--rhythm','chosen');
 mode='redirect';assert.notEqual((await call('account','connect','--server',origin)).status,0);
 mode='normal';await run('account','connect','--server',origin);
 const file=path.join(dir,'note.txt');fs.writeFileSync(file,' selected original\n');
 await run('source','add','--id','test','--kind','file','--locator',file,'--scope','test');
 const item=(await run('collect','--source','test')).results[0];
 const preview=await run('upload','preview','--id',item.id);assert.equal(posts,0);
 await run('upload','approve','--id',item.id,'--hash',preview.reviewHash);assert.equal(posts,0);
 const state=()=>JSON.parse(fs.readFileSync(path.join(home,'inbox',item.id+'.json'),'utf8'));
 mode='uncertain';assert.notEqual((await call('upload','send','--id',item.id)).status,0);assert.equal(state().upload.state,'awaiting-confirmation');
 mode='bad-readback';assert.notEqual((await call('upload','send','--id',item.id)).status,0);assert.equal(state().upload.state,'awaiting-confirmation');
 mode='normal';const result=await run('upload','send','--id',item.id);assert.equal(result.state,'synced');assert.equal(posts,3);
 assert.equal(state().upload.envelope.clientCaptureId,item.id);
 mode='revoked';assert.notEqual((await call('upload','send','--id',item.id)).status,0);assert.equal(posts,3);
});
