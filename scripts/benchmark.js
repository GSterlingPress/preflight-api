import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {probeUrl} from '../src/probe.js';
import {createDomainCache} from '../src/cache.js';
import {scoreObservation,summarizeBenchmark} from '../src/benchmark.js';

const corpusPath=new URL('../benchmarks/sites.json',import.meta.url);
const corpus=JSON.parse(await fs.readFile(corpusPath,'utf8'));
const only=process.env.PREFLIGHT_BENCHMARK_CATEGORY;
const limit=Math.max(1,Number(process.env.PREFLIGHT_BENCHMARK_LIMIT||corpus.length));
const selected=corpus.filter(x=>!only||x.category===only).slice(0,limit);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'preflight-bench-'));
const domainCache=createDomainCache({dataDir:temp,ttlMs:60*60*1000});
const rows=[];

console.log(`PREFLIGHT live benchmark: ${selected.length} targets`);
for(const site of selected){
  const started=Date.now();
  let result;
  try{result=await probeUrl(site.url,{domainCache});}
  catch(error){result={bestRoute:'ERROR',reachable:false,latencyMs:Date.now()-started,error:{message:error?.message||String(error)}};}
  const row=scoreObservation(site,result);rows.push(row);
  console.log(`${row.routeMatch?'✓':'·'} ${site.id.padEnd(22)} ${String(row.actualRoute).padEnd(16)} ${row.status??'-'} ${row.latencyMs??'-'}ms`);
}

const summary=summarizeBenchmark(rows);
const report={schemaVersion:1,generatedAt:new Date().toISOString(),preflightVersion:'0.3.0',corpusSize:corpus.length,selected: selected.map(x=>x.id),summary,observations:rows};
const outDir=path.resolve(process.env.PREFLIGHT_BENCHMARK_OUT||'benchmark-results');
await fs.mkdir(outDir,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const file=path.join(outDir,`benchmark-${stamp}.json`);
await fs.writeFile(file,JSON.stringify(report,null,2));
await fs.writeFile(path.join(outDir,'latest.json'),JSON.stringify(report,null,2));
await fs.rm(temp,{recursive:true,force:true});
console.log(`\nRoute match: ${summary.matched}/${summary.total} (${Math.round(summary.accuracy*100)}%)`);
console.log(`Strict controls: ${summary.strictMatched}/${summary.strictCases} (${Math.round(summary.strictAccuracy*100)}%)`);
console.log(`Errors: ${summary.errors}`);
console.log(`Report: ${file}`);

// Live web behavior changes. Do not fail merely because a site's route changed.
// Fail only if the benchmark machinery itself produced no observations.
if(!rows.length)process.exitCode=2;
