import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreObservation,summarizeBenchmark} from '../src/benchmark.js';

test('scores route matches without treating flexible live cases as failures',()=>{
  const site={id:'x',category:'docs',url:'https://example.com',acceptableRoutes:['HTTP','MACHINE_ENDPOINT']};
  const row=scoreObservation(site,{bestRoute:'MACHINE_ENDPOINT',reachable:true,status:200,confidence:.91,latencyMs:12,machineEndpoints:[{url:'x'}]});
  assert.equal(row.routeMatch,true);assert.equal(row.machineEndpoints,1);assert.equal(row.actualRoute,'MACHINE_ENDPOINT');
});

test('summarizes total, strict, and category accuracy',()=>{
  const rows=[
    scoreObservation({id:'a',category:'api',url:'a',acceptableRoutes:['HTTP']},{bestRoute:'HTTP'}),
    scoreObservation({id:'b',category:'api',url:'b',acceptableRoutes:['HTTP']},{bestRoute:'BROWSER'}),
    scoreObservation({id:'c',category:'web',url:'c',acceptableRoutes:['HTTP','BROWSER']},{bestRoute:'BROWSER'})
  ];
  const s=summarizeBenchmark(rows);
  assert.equal(s.total,3);assert.equal(s.matched,2);assert.equal(s.strictCases,2);assert.equal(s.strictMatched,1);assert.equal(s.byCategory.api.total,2);assert.equal(s.byCategory.web.accuracy,1);
});
