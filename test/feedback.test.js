import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLearnedRoute,applyRouteFeedback} from '../src/feedback.js';

function evidence({url={},domain={}}={}){const blank={HTTP:{success:0,failure:0,total:0,successRate:null,avgLatencyMs:null},BROWSER:{success:0,failure:0,total:0,successRate:null,avgLatencyMs:null},MACHINE_ENDPOINT:{success:0,failure:0,total:0,successRate:null,avgLatencyMs:null},AVOID:{success:0,failure:0,total:0,successRate:null,avgLatencyMs:null}};return {url:{samples:0,routes:{...blank,...url}},domain:{samples:0,routes:{...blank,...domain}}};}

test('requires enough evidence before learning a URL route',()=>{
 assert.equal(chooseLearnedRoute(evidence({url:{BROWSER:{success:4,failure:0,total:4,successRate:1,avgLatencyMs:900}}})),null);
 const learned=chooseLearnedRoute(evidence({url:{BROWSER:{success:5,failure:0,total:5,successRate:1,avgLatencyMs:900}}}));
 assert.equal(learned.route,'BROWSER');assert.equal(learned.scope,'url');
});

test('domain learning requires stronger sample threshold',()=>{
 assert.equal(chooseLearnedRoute(evidence({domain:{HTTP:{success:9,failure:0,total:9,successRate:1,avgLatencyMs:100}}})),null);
 assert.equal(chooseLearnedRoute(evidence({domain:{HTTP:{success:9,failure:1,total:10,successRate:.9,avgLatencyMs:100}}})).route,'HTTP');
});

test('feedback can override a non-safety route',()=>{
 const base={bestRoute:'HTTP',reason:'probe',confidence:.7};const ev=evidence({url:{BROWSER:{success:5,failure:0,total:5,successRate:1,avgLatencyMs:700}}});
 const out=applyRouteFeedback(base,ev);assert.equal(out.bestRoute,'BROWSER');assert.equal(out.feedback.applied,true);assert.equal(out.feedback.probeRoute,'HTTP');
});

test('feedback never overrides AVOID',()=>{
 const base={bestRoute:'AVOID',reason:'robots blocked',confidence:.98};const ev=evidence({url:{BROWSER:{success:20,failure:0,total:20,successRate:1,avgLatencyMs:700}}});
 const out=applyRouteFeedback(base,ev);assert.equal(out.bestRoute,'AVOID');assert.equal(out.feedback.applied,false);
});
