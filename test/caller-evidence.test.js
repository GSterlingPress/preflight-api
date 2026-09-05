import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityStore} from '../src/activity.js';

function req({ua='agent-client',ip='203.0.113.10',url='/mcp',session,referer}={}){return {method:'POST',url,headers:{'user-agent':ua,'x-forwarded-for':ip,...(session?{'mcp-session-id':session}:{}),...(referer?{referer}:{})},socket:{remoteAddress:ip}}}

test('REST request path never retains target query value',()=>{const a=new ActivityStore({callerSecret:'test-secret'});const target='https://docs.example.org/private/path?token=super-secret';const r=req({url:'/v1/check?url='+encodeURIComponent(target)+'&src=github'});a.record(r,{kind:'check',route:'HTTP',target,input:{url:target}});const e=a.snapshot().feed[0];assert.equal(e.audit.requestPath,'/v1/check');assert.equal(JSON.stringify(e).includes('super-secret'),false);assert.equal(e.source,'GitHub')});

test('referrer is retained only as a host',()=>{const a=new ActivityStore({callerSecret:'test-secret'});const r=req({referer:'https://agent.example/private/page?token=hidden'});a.record(r,{kind:'check',route:'HTTP',target:'https://nodejs.org',input:{url:'https://nodejs.org'}});const e=a.snapshot().feed[0];assert.equal(e.referrerHost,'agent.example');assert.equal(e.audit.referrerHost,'agent.example');assert.equal(JSON.stringify(e).includes('token=hidden'),false)});

test('directory attribution is not itself validator evidence',()=>{const a=new ActivityStore({callerSecret:'test-secret'});const r=req({url:'/mcp?src=glama',session:'real-user-via-glama',ua:'modelcontextprotocol-client'});a.record(r,{kind:'mcp',route:'initialize',clientInfo:{name:'Cursor',version:'2.0'}});a.record(r,{kind:'mcp',route:'tools/call:preflight_check',target:'https://nodejs.org',input:{url:'https://nodejs.org'}});const s=a.snapshot();assert.equal(s.candidateRealUse[0].discoveryAttribution,'Glama');assert.equal(s.candidateRealUse[0].classification,'CREDIBLE_REAL_USE');assert.equal(s.realUse.allTimeVerifiedStrangers,1)});

test('unknown caller counter excludes likely validators',()=>{const a=new ActivityStore({callerSecret:'test-secret'});const r=req({session:'quick-probe'});a.record(r,{kind:'mcp',route:'tools/list'});a.record(r,{kind:'mcp',route:'tools/call:preflight_check',target:'https://nodejs.org',input:{url:'https://nodejs.org'}});const s=a.snapshot();assert.equal(s.candidateRealUse[0].classification,'LIKELY_VALIDATOR');assert.equal(s.callerEvidence.unknownIndependentCallers,0)});
