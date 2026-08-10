import http from 'node:http';
import crypto from 'node:crypto';
import {FileCache} from './cache.js';
import {probeUrl} from './probe.js';

export const VERSION='0.1.0';
const cache=new FileCache();
const baseHeaders={'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','cache-control':'no-store'};
function send(res,status,body,headers={}){const json=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(json),...baseHeaders,...headers});res.end(json)}
function keyFor(url){const u=new URL(url);u.hash='';return u.href;}
export function createServer({cacheStore=cache,probe=probeUrl}={}){
 return http.createServer(async(req,res)=>{res.setHeader('x-request-id',req.headers['x-request-id']||crypto.randomUUID());const u=new URL(req.url,'http://preflight.local');try{
   if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,service:'PREFLIGHT',version:VERSION});
   if(req.method==='GET'&&u.pathname==='/version')return send(res,200,{service:'PREFLIGHT',version:VERSION});
   if(req.method==='GET'&&u.pathname==='/')return send(res,200,{name:'PREFLIGHT',tagline:'Before your AI agent visits a URL, ask us how to get there.',check:'GET /v1/check?url=https://example.com'});
   if(req.method==='GET'&&u.pathname==='/v1/check'){
     const target=u.searchParams.get('url');if(!target)return send(res,400,{error:'Missing url query parameter',code:'PREFLIGHT_BAD_REQUEST'});
     let key;try{key=keyFor(target)}catch{return send(res,400,{error:'Invalid URL',code:'PREFLIGHT_BAD_URL'})}
     const hit=await cacheStore.get(key);if(hit)return send(res,200,hit,{'x-preflight-cache':'HIT'});
     const result=await probe(target);const stored=await cacheStore.put(key,result);return send(res,200,stored,{'x-preflight-cache':'MISS'});
   }
   return send(res,404,{error:'Not found'});
  }catch(e){return send(res,500,{error:e instanceof Error?e.message:'Unknown error',code:e?.code||'PREFLIGHT_INTERNAL'});}});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){const server=createServer();const port=Number(process.env.PORT||8080);server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`PREFLIGHT ${VERSION} listening on :${port}`));const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);}
