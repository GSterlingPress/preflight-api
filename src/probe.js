import {safeFetch} from './net.js';

function attr(tag,name){const m=new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`,'i').exec(tag);return m?.[1]??null;}
function absolute(value,base){try{return new URL(value,base).href}catch{return null}}
function parseHtml(html,base){
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
  const canonical=links.find(t=>(attr(t,'rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
  const machine=[];
  for(const t of links){const rel=(attr(t,'rel')||'').toLowerCase(),type=(attr(t,'type')||'').toLowerCase(),href=absolute(attr(t,'href'),base);if(!href)continue;if(rel.includes('alternate')&&(type.includes('rss')||type.includes('atom')||type.includes('json')||type.includes('markdown')))machine.push({type:type||'alternate',url:href});}
  const jsonLd=(html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi)||[]).length;
  const scripts=(html.match(/<script\b/gi)||[]).length;
  const textChars=html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().length;
  const jsMarkers=/(id=["'](?:root|app|__next)["']|__NEXT_DATA__|webpack|vite|data-reactroot)/i.test(html);
  const login=/(sign in|log in|login|authentication required)/i.test(html.slice(0,200000));
  const captcha=/(captcha|cf-chl-|hcaptcha|recaptcha)/i.test(html.slice(0,300000));
  const paywall=/(paywall|subscribe to continue|subscription required|meteredContent)/i.test(html.slice(0,300000));
  return {canonical:canonical?absolute(attr(canonical,'href'),base):null,machine,jsonLd,scripts,textChars,jsLikely:jsMarkers&&textChars<1200,login,captcha,paywall};
}
function routeDecision({reachable,status,contentType,html,bytes,machine}){
  if(!reachable||status>=500)return {route:'AVOID',reason:'Destination did not return a usable response.',confidence:.9};
  if(status===401||status===403)return {route:'AVOID',reason:'Destination requires authorization or denied access.',confidence:.9};
  if(status===402)return {route:'AVOID',reason:'Destination requires payment (HTTP 402).',confidence:.99};
  if(status===429)return {route:'AVOID',reason:'Destination is rate limiting requests.',confidence:.95};
  if(machine?.length)return {route:'MACHINE_ENDPOINT',reason:'A smaller machine-readable alternate endpoint is advertised.',confidence:.9};
  if(contentType.includes('json')||contentType.includes('xml')||contentType.includes('text/plain')||contentType.includes('markdown'))return {route:'HTTP',reason:'The URL already returns machine-friendly content.',confidence:.95};
  if(html?.captcha)return {route:'BROWSER',reason:'CAPTCHA/challenge markers suggest simple HTTP may not be sufficient.',confidence:.8};
  if(html?.jsLikely)return {route:'BROWSER',reason:'The HTML appears to be a JavaScript shell with little server-rendered text.',confidence:.78};
  if(bytes>2_000_000)return {route:'HTTP',reason:'HTTP works, but the response is large; downstream extraction should be selective.',confidence:.8};
  return {route:'HTTP',reason:'The page is directly reachable and appears usable without browser rendering.',confidence:.82};
}
async function robotsSignal(url){
  const u=new URL(url);const robots=`${u.origin}/robots.txt`;
  try{const {response}=await safeFetch(robots,{headers:{'user-agent':'PREFLIGHT/0.1'}});if(!response.ok)return {url:robots,status:response.status,policy:'unknown'};const txt=(await response.text()).slice(0,250000);const blocksAll=/user-agent:\s*\*([\s\S]*?)(?:user-agent:|$)/i.exec(txt)?.[1]?.match(/disallow:\s*\/\s*$/im);return {url:robots,status:response.status,policy:blocksAll?'blocked':'not_globally_blocked'};}catch{return {url:robots,status:null,policy:'unknown'}}
}
export async function probeUrl(input){
  const started=Date.now();
  let fetched;
  try{fetched=await safeFetch(input,{headers:{'user-agent':'PREFLIGHT/0.1 (+https://github.com/GSterlingPress/preflight-api)','accept':'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5','range':'bytes=0-2097151'}});}catch(e){return {url:input,reachable:false,error:{code:e?.code||'PREFLIGHT_FETCH',message:e?.name==='AbortError'?'Fetch timed out':e.message},bestRoute:'AVOID',reason:'PREFLIGHT could not safely reach the destination.',confidence:.95,latencyMs:Date.now()-started};}
  const {response,url,redirectChain}=fetched;const contentType=(response.headers.get('content-type')||'').toLowerCase();const body=await response.arrayBuffer();const bytes=body.byteLength;const text=new TextDecoder('utf-8',{fatal:false}).decode(body);const html=contentType.includes('html')?parseHtml(text,url):null;
  const linkHeader=response.headers.get('link')||'';const headerMachine=[...linkHeader.matchAll(/<([^>]+)>;[^,]*(?:type="([^"]+)"|rel="alternate")/gi)].map(m=>({type:m[2]||'alternate',url:absolute(m[1],url)})).filter(x=>x.url);
  const machineEndpoints=[...(html?.machine||[]),...headerMachine].filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
  const reachable=response.status>0&&response.status<500;const decision=routeDecision({reachable,status:response.status,contentType,html,bytes,machine:machineEndpoints});const robots=await robotsSignal(url);
  return {url:input,finalUrl:url,reachable,status:response.status,bestRoute:decision.route,reason:decision.reason,confidence:decision.confidence,robots:robots.policy,access:{authentication:response.status===401||response.status===403||!!html?.login,payment:response.status===402||!!html?.paywall,captchaRisk:html?.captcha?'high':'low'},javascript:html?.jsLikely??null,content:{type:contentType||null,bytes,estimatedTokens:Math.max(1,Math.ceil((html?.textChars??text.length)/4)),jsonLd:html?.jsonLd??0},machineEndpoints,canonical:html?.canonical??null,redirects:redirectChain.length>1?redirectChain:[],latencyMs:Date.now()-started,observedAt:new Date().toISOString()};
}
