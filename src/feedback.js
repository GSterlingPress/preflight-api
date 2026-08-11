import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROUTES=['HTTP','BROWSER','MACHINE_ENDPOINT','AVOID'];
export const OUTCOMES=['success','failure'];
function defaultDataDir(){return process.env.PREFLIGHT_DATA_DIR??(process.env.RAILWAY_ENVIRONMENT?'/data':path.resolve('.preflight-data'));}
function normalizeUrl(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Object.assign(new Error('Only http/https URLs are allowed'),{code:'PREFLIGHT_BAD_URL'});u.hash='';return u.href;}
function hash(value){return crypto.createHash('sha256').update(value).digest('hex');}
function emptyRoute(){return {success:0,failure:0,total:0,latencySamples:0,latencyTotalMs:0};}
function addSample(bucket,outcome,latencyMs){bucket[outcome]++;bucket.total++;if(Number.isFinite(latencyMs)&&latencyMs>=0&&latencyMs<=300000){bucket.latencySamples++;bucket.latencyTotalMs+=latencyMs;}}
function publicRoute(bucket={}){const total=Number(bucket.total||0),success=Number(bucket.success||0),failure=Number(bucket.failure||0);return {success,failure,total,successRate:total?Number((success/total).toFixed(3)):null,avgLatencyMs:bucket.latencySamples?Math.round(bucket.latencyTotalMs/bucket.latencySamples):null};}
function publicScope(scope){const routes={};for(const route of ROUTES)routes[route]=publicRoute(scope?.routes?.[route]);return {samples:Object.values(routes).reduce((n,r)=>n+r.total,0),routes};}

export class FeedbackStore{
  constructor({dataDir=defaultDataDir()}={}){this.dataDir=dataDir;this.file=path.join(dataDir,'route-feedback.json');this.loaded=false;this.data={urls:{},domains:{}};}
  async init(){if(this.loaded)return;try{this.data=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e?.code!=='ENOENT')throw e}this.data.urls??={};this.data.domains??={};this.loaded=true;}
  async ready(){await fs.mkdir(this.dataDir,{recursive:true});await fs.access(this.dataDir,fs.constants.W_OK);await this.init();return {ok:true,dataDir:this.dataDir};}
  async persist(){await fs.mkdir(path.dirname(this.file),{recursive:true});const tmp=`${this.file}.${process.pid}.${Date.now()}.tmp`;await fs.writeFile(tmp,JSON.stringify(this.data,null,2),{mode:0o600});await fs.rename(tmp,this.file);}
  async record({url,route,outcome,latencyMs=null}){
    await this.init();const normalized=normalizeUrl(url);if(!ROUTES.includes(route))throw Object.assign(new Error('Invalid route'),{code:'PREFLIGHT_BAD_FEEDBACK'});if(!OUTCOMES.includes(outcome))throw Object.assign(new Error('Invalid outcome'),{code:'PREFLIGHT_BAD_FEEDBACK'});
    const origin=new URL(normalized).origin,urlKey=hash(normalized),domainKey=hash(origin);
    const urlScope=this.data.urls[urlKey]??={originHash:domainKey,routes:{},updatedAt:null};const domainScope=this.data.domains[domainKey]??={origin,routes:{},updatedAt:null};
    urlScope.routes[route]??=emptyRoute();domainScope.routes[route]??=emptyRoute();addSample(urlScope.routes[route],outcome,latencyMs);addSample(domainScope.routes[route],outcome,latencyMs);urlScope.updatedAt=domainScope.updatedAt=new Date().toISOString();this.data.urls[urlKey]=urlScope;this.data.domains[domainKey]=domainScope;await this.persist();
    return {feedbackId:crypto.randomUUID(),accepted:true,urlHash:urlKey.slice(0,16),domainHash:domainKey.slice(0,16)};
  }
  async evidence(url){await this.init();const normalized=normalizeUrl(url),origin=new URL(normalized).origin;const urlKey=hash(normalized),domainKey=hash(origin);return {url:publicScope(this.data.urls[urlKey]),domain:publicScope(this.data.domains[domainKey])};}
}

export function chooseLearnedRoute(evidence){
  const candidates=[];
  for(const [scopeName,scope,minSamples,minRate] of [['url',evidence?.url,5,.8],['domain',evidence?.domain,10,.85]]){
    for(const route of ROUTES){if(route==='AVOID')continue;const r=scope?.routes?.[route];if(r&&r.total>=minSamples&&r.successRate>=minRate)candidates.push({route,scope:scopeName,samples:r.total,successRate:r.successRate,avgLatencyMs:r.avgLatencyMs});}
  }
  candidates.sort((a,b)=>b.successRate-a.successRate||b.samples-a.samples||(a.scope==='url'?-1:1));return candidates[0]??null;
}

export function applyRouteFeedback(result,evidence){
  const learned=chooseLearnedRoute(evidence);const out={...result,feedback:{evidence,learnedRoute:learned,applied:false}};
  if(!learned||result.bestRoute==='AVOID'||learned.route===result.bestRoute)return out;
  const confidence=Math.min(.94,Math.max(Number(result.confidence||0),learned.successRate));
  return {...out,bestRoute:learned.route,reason:`Observed route feedback favors ${learned.route} (${Math.round(learned.successRate*100)}% success across ${learned.samples} ${learned.scope} samples).`,confidence,feedback:{...out.feedback,applied:true,probeRoute:result.bestRoute}};
}
