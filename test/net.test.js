import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicUrl} from '../src/net.js';

test('blocks localhost and private network targets',async()=>{
  await assert.rejects(()=>assertPublicUrl('http://127.0.0.1/x'),e=>e.code==='PREFLIGHT_UNSAFE_URL');
  await assert.rejects(()=>assertPublicUrl('http://10.0.0.1/x'),e=>e.code==='PREFLIGHT_UNSAFE_URL');
});

test('rejects non-http protocols and credential URLs',async()=>{
  await assert.rejects(()=>assertPublicUrl('file:///etc/passwd'),e=>e.code==='PREFLIGHT_BAD_URL');
  await assert.rejects(()=>assertPublicUrl('https://user:pass@example.com'),e=>e.code==='PREFLIGHT_BAD_URL');
});
