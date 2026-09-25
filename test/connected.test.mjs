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
