// Run only against an explicitly selected test server and synthetic account tokens.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const cli=fileURLToPath(new URL('../bin/kh.mjs',import.meta.url));
const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kh-connected-test-'))), home=path.join(base,'state');
const server=process.env.KH_TEST_SERVER, tokenA=process.env.KH_TEST_TOKEN_A, tokenB=process.env.KH_TEST_TOKEN_B;
if(!server || !tokenA || !tokenB) throw new Error('Provide explicit KH_TEST_SERVER and two synthetic KH_TEST_TOKEN_A/B credentials.');
let token=tokenA;
function call(...args){return spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,KH_HOME:home,KH_TOKEN:token}});}
function run(...args){const r=call(...args);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
function fails(...args){assert.notEqual(call(...args).status,0,'Expected refusal: '+args.join(' '));}
try {
 run('init','--timezone','UTC','--rhythm','User chosen test rhythm');
 const file=path.join(base,'selected.txt'), original='  Synthetic connection test.\nExact original.\n';fs.writeFileSync(file,original);
 run('source','add','--id','selected','--kind','file','--locator',file,'--scope','This test file');
 const item=run('collect','--source','selected').results[0];
 run('review','--id',item.id,'--digest',item.digest,'--decision','approve');
 const connected=run('account','connect','--server',server);
 assert.equal(fs.readFileSync(path.join(home,'config.json'),'utf8').includes(tokenA),false);
 fails('upload','send','--id',item.id);
 let preview=run('upload','preview','--id',item.id);
 assert.equal(preview.payload.originalWords,original);
 fails('upload','approve','--id',item.id,'--hash','wrong');
 run('upload','approve','--id',item.id,'--hash',preview.reviewHash);
 token=tokenB;fails('upload','send','--id',item.id);
 run('account','connect','--server',server);fails('upload','send','--id',item.id);
 token=tokenA;run('account','connect','--server',server);
 const recordPath=path.join(home,'inbox',item.id+'.json');
 const local=JSON.parse(fs.readFileSync(recordPath,'utf8'));local.reflection='User reviewed synthetic reflection';fs.writeFileSync(recordPath,JSON.stringify(local));
 fails('upload','send','--id',item.id);
 preview=run('upload','preview','--id',item.id);run('upload','approve','--id',item.id,'--hash',preview.reviewHash);
 const saved=run('upload','send','--id',item.id);
 assert.equal(saved.state,'synced');assert.equal(saved.url,server+'/app/moments/'+saved.recordId);
 assert.equal(run('upload','send','--id',item.id).recordId,saved.recordId);
 const remote=run('moments','show','--id',saved.recordId);
 assert.equal(remote.record.document.originalWords,original);
 assert.equal(remote.record.document.reflections[0].words,local.reflection);
 assert.equal(run('moments','list').records.filter(x=>x.id===saved.recordId).length,1);
 token=tokenB;run('account','connect','--server',server);fails('moments','show','--id',saved.recordId);
 run('account','disconnect');fails('upload','send','--id',item.id);
 console.log('PASS connected CLI: real account verification, old approval refusal, exact preview, account switch, content change, reviewed upload, read-back, retry and tenant isolation.');
} finally {fs.rmSync(base,{recursive:true,force:true});}
