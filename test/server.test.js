import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,VERSION} from '../src/server.js';

class MemoryCache{constructor(){this.m=new Map()}async get(k){const v=this.m.get(k);return v?{...v,cache:{hit:true}}:null}async put(k,v){this.m.set(k,v);return {...v,cache:{hit:false}}}}
async function withServer(fn,{probe=async url=>({url,reachable:true,status:200,bestRoute:'HTTP',reason:'test',confidence:1})}={}){const s=createServer({cacheStore:new MemoryCache(),probe});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${s.address().port}`)}finally{await new Promise(r=>s.close(r))}}

test('health and version endpoints',()=>withServer(async base=>{let r=await fetch(base+'/health');assert.equal(r.status,200);assert.equal((await r.json()).version,VERSION);r=await fetch(base+'/version');assert.equal((await r.json()).service,'PREFLIGHT')}));

test('check requires a URL',()=>withServer(async base=>{const r=await fetch(base+'/v1/check');assert.equal(r.status,400);assert.equal((await r.json()).code,'PREFLIGHT_BAD_REQUEST')}));

test('check probes once then serves cached answer',()=>{let calls=0;return withServer(async base=>{const url=encodeURIComponent('https://example.com/a');let r=await fetch(`${base}/v1/check?url=${url}`);assert.equal(r.headers.get('x-preflight-cache'),'MISS');let j=await r.json();assert.equal(j.bestRoute,'HTTP');assert.equal(j.cache.hit,false);r=await fetch(`${base}/v1/check?url=${url}`);assert.equal(r.headers.get('x-preflight-cache'),'HIT');j=await r.json();assert.equal(j.cache.hit,true);assert.equal(calls,1);},{probe:async url=>{calls++;return {url,reachable:true,status:200,bestRoute:'HTTP',reason:'test',confidence:1}}})});
