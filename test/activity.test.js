import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityStore} from '../src/activity.js';

function req({ua='agent-client',ip='203.0.113.10',source}={}){return {headers:{'user-agent':ua,'x-forwarded-for':ip,...(source?{'x-preflight-source':source}:{})},socket:{remoteAddress:ip}}}

test('activity counts outside calls and unique callers',()=>{const a=new ActivityStore();a.record(req(),{kind:'check',route:'HTTP',target:'https://example.com'});a.record(req({ip:'203.0.113.11'}),{kind:'mcp',route:'tools/call'});const s=a.snapshot();assert.equal(s.external.callsToday,2);assert.equal(s.external.uniqueCallersToday,2);assert.equal(s.external.checksToday,1);assert.equal(s.external.mcpCallsToday,1);assert.equal(s.feed.length,2)});

test('activity filters identifiable CI/test traffic',()=>{const a=new ActivityStore();a.record(req({ua:'curl/8.0'}),{kind:'check',route:'HTTP',target:'https://example.com'});a.record(req({ua:'real-agent'}),{kind:'check',route:'HTTP',target:'https://example.org'});const s=a.snapshot();assert.equal(s.all.callsToday,2);assert.equal(s.external.callsToday,1);assert.equal(s.feed[0].host,'example.org')});

test('activity does not expose raw caller addresses',()=>{const a=new ActivityStore();a.record(req({ip:'198.51.100.42'}),{kind:'check',target:'https://example.com'});const e=a.snapshot().feed[0];assert.notEqual(e.caller,'198.51.100.42');assert.equal(e.caller.length,12)});
