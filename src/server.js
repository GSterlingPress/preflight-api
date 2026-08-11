import http from 'node:http';
import crypto from 'node:crypto';
import {createUrlCache} from './cache.js';
import {probeUrl} from './probe.js';
import {FeedbackStore,applyRouteFeedback,ROUTES,OUTCOMES} from './feedback.js';

export const VERSION='0.4.0';
const cache=createUrlCache();
const feedback=new FeedbackStore();
const baseHeaders={'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','cache-control':'no-store'};
function send(res,status,body,headers={}){const json=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(json),...baseHeaders,...headers});res.end(json)}
function keyFor(url){const u=new URL(url);u.hash='';return u.href;}
async function readJson(req,maxBytes=16384){let total=0,chunks=[];for await(const chunk of req){total+=chunk.length;if(total>maxBytes)throw Object.assign(new Error('Request body too large'),{code:'PREFLIGHT_BODY_TOO_LARGE'});chunks.push(chunk);}if(!chunks.length)return {};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(new Error('Invalid JSON body'),{code:'PREFLIGHT_BAD_JSON'})}}
function validateFeedback(body){if(!body||typeof body!=='object')throw Object.assign(new Error('Feedback body is required'),{code:'PREFLIGHT_BAD_FEEDBACK'});let u;try{u=new URL(body.url)}catch{throw Object.assign(new Error('Invalid feedback URL'),{code:'PREFLIGHT_BAD_FEEDBACK'})}if(!['http:','https:'].includes(u.protocol))throw Object.assign(new Error('Feedback URL must be http/https'),{code:'PREFLIGHT_BAD_FEEDBACK'});if(!ROUTES.includes(body.route))throw Object.assign(new Error(`route must be one of ${ROUTES.join(', ')}`),{code:'PREFLIGHT_BAD_FEEDBACK'});if(!OUTCOMES.includes(body.outcome))throw Object.assign(new Error(`outcome must be one of ${OUTCOMES.join(', ')}`),{code:'PREFLIGHT_BAD_FEEDBACK'});const latencyMs=body.latencyMs==null?null:Number(body.latencyMs);if(latencyMs!=null&&(!Number.isFinite(latencyMs)||latencyMs<0||latencyMs>300000))throw Object.assign(new Error('latencyMs must be between 0 and 300000'),{code:'PREFLIGHT_BAD_FEEDBACK'});return {url:u.href,route:body.route,outcome:body.outcome,latencyMs};}

export function createServer({cacheStore=cache,probe=probeUrl,feedbackStore=feedback}={}){
 return http.createServer(async(req,res)=>{res.setHeader('x-request-id',req.headers['x-request-id']||crypto.randomUUID());const u=new URL(req.url,'http://preflight.local');try{
   if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,service:'PREFLIGHT',version:VERSION});
   if(req.method==='GET'&&u.pathname==='/version')return send(res,200,{service:'PREFLIGHT',version:VERSION});
   if(req.method==='GET'&&u.pathname==='/')return send(res,200,{name:'PREFLIGHT',version:VERSION,tagline:'Before your AI agent visits a URL, ask us how to get there.',check:'GET /v1/check?url=https://example.com',feedback:'POST /v1/feedback',routes:ROUTES});
   if(req.method==='GET'&&u.pathname==='/v1/check'){
     const target=u.searchParams.get('url');if(!target)return send(res,400,{error:'Missing url query parameter',code:'PREFLIGHT_BAD_REQUEST'});
     let key;try{key=keyFor(target)}catch{return send(res,400,{error:'Invalid URL',code:'PREFLIGHT_BAD_URL'})}
     const hit=await cacheStore.get(key);if(hit){const evidence=await feedbackStore.evidence(target);return send(res,200,applyRouteFeedback(hit,evidence),{'x-preflight-cache':'HIT'});}
     const result=await probe(target);const stored=await cacheStore.put(key,result);const evidence=await feedbackStore.evidence(target);return send(res,200,applyRouteFeedback(stored,evidence),{'x-preflight-cache':'MISS'});
   }
   if(req.method==='POST'&&u.pathname==='/v1/feedback'){
     const body=validateFeedback(await readJson(req));const receipt=await feedbackStore.record(body);const evidence=await feedbackStore.evidence(body.url);return send(res,202,{...receipt,evidence});
   }
   return send(res,404,{error:'Not found'});
  }catch(e){const status=e?.code==='PREFLIGHT_UNSAFE_URL'?422:e?.code==='PREFLIGHT_BODY_TOO_LARGE'?413:['PREFLIGHT_BAD_URL','PREFLIGHT_BAD_JSON','PREFLIGHT_BAD_FEEDBACK'].includes(e?.code)?400:500;return send(res,status,{error:e instanceof Error?e.message:'Unknown error',code:e?.code||'PREFLIGHT_INTERNAL'});}});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){const server=createServer();const port=Number(process.env.PORT||8080);server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`PREFLIGHT ${VERSION} listening on :${port}`));const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);}
