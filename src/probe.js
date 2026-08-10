import {safeFetch} from './net.js';
import {createDomainCache} from './cache.js';

const defaultDomainCache=createDomainCache();
const UA='PREFLIGHT/0.2 (+https://github.com/GSterlingPress/preflight-api)';

function attr(tag,name){const m=new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`,'i').exec(tag);return m?.[1]??null;}
function absolute(value,base){try{return value?new URL(value,base).href:null}catch{return null}}
function uniq(items){const seen=new Set();return items.filter(x=>x?.url&&!seen.has(x.url)&&seen.add(x.url));}
function textTokenEstimate(chars){return Math.max(1,Math.ceil(chars/4));}

export function parseHtml(html,base){
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
  const canonicalTag=links.find(t=>(attr(t,'rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
  const machine=[];
  for(const t of links){
    const rel=(attr(t,'rel')||'').toLowerCase(),type=(attr(t,'type')||'').toLowerCase(),href=absolute(attr(t,'href'),base);
    if(!href)continue;
    if(rel.includes('alternate')&&(type.includes('rss')||type.includes('atom')||type.includes('json')||type.includes('markdown')||type.includes('xml')))machine.push({kind:'advertised-alternate',type:type||'alternate',url:href});
    if(rel.includes('alternate')&&/\.json($|\?)/i.test(href))machine.push({kind:'advertised-alternate',type:'application/json',url:href});
  }
  const jsonLd=(html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi)||[]).length;
  const scripts=(html.match(/<script\b/gi)||[]).length;
  const visible=html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  const textChars=visible.length;
  const jsMarkers=/(id=["'](?:root|app|__next)["']|__NEXT_DATA__|webpack|vite|data-reactroot|ng-version)/i.test(html);
  const login=/(sign in|log in|login|authentication required|please authenticate)/i.test(visible.slice(0,200000));
  const captcha=/(captcha|cf-chl-|hcaptcha|recaptcha|challenge-platform)/i.test(html.slice(0,300000));
  const paywall=/(paywall|subscribe to continue|subscription required|meteredContent|subscriber-only)/i.test(html.slice(0,300000));
  return {canonical:canonicalTag?absolute(attr(canonicalTag,'href'),base):null,machine:uniq(machine),jsonLd,scripts,textChars,jsLikely:jsMarkers&&textChars<1600,login,captcha,paywall};
}

function parseRobotsGroups(text){
  const groups=[];let current=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,'').trim();if(!line)continue;
    const i=line.indexOf(':');if(i<0)continue;
    const field=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();
    if(field==='user-agent'){
      if(!current||current.rules.length){current={agents:[],rules:[]};groups.push(current);}
      current.agents.push(value.toLowerCase());
    }else if(current&&(field==='allow'||field==='disallow'))current.rules.push({type:field,path:value});
  }
  return groups;
}
function ruleMatches(rulePath,path){if(rulePath==='')return false;const escaped=rulePath.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\$$/,'$');try{return new RegExp(`^${escaped}`).test(path)}catch{return path.startsWith(rulePath)}}
export function robotsDecision(text,targetUrl,userAgent='preflight'){
  const path=new URL(targetUrl).pathname||'/';const groups=parseRobotsGroups(text);
  let selected=groups.filter(g=>g.agents.includes(userAgent.toLowerCase()));
  if(!selected.length)selected=groups.filter(g=>g.agents.includes('*'));
  const rules=selected.flatMap(g=>g.rules).filter(r=>ruleMatches(r.path,path));
  if(!rules.length)return {allowed:true,policy:'allowed',matchedRule:null};
  rules.sort((a,b)=>b.path.length-a.path.length||(a.type==='allow'?-1:1));const winner=rules[0];
  return {allowed:winner.type==='allow',policy:winner.type==='allow'?'allowed':'blocked',matchedRule:winner};
}

async function inspectRobots(origin,targetUrl){
  const robots=`${origin}/robots.txt`;
  try{
    const {response}=await safeFetch(robots,{headers:{'user-agent':UA,'accept':'text/plain,*/*;q=0.1'}});
    if(!response.ok)return {url:robots,status:response.status,allowed:null,policy:'unknown',matchedRule:null};
    const raw=(await response.text()).slice(0,300000);
    return {url:robots,status:response.status,raw,...robotsDecision(raw,targetUrl)};
  }catch{return {url:robots,status:null,allowed:null,policy:'unknown',matchedRule:null};}
}

async function discoverOriginEndpoints(origin){
  const candidates=[
    {kind:'openapi',url:`${origin}/openapi.json`},
    {kind:'ai-plugin',url:`${origin}/.well-known/ai-plugin.json`},
    {kind:'sitemap',url:`${origin}/sitemap.xml`}
  ];
  const found=[];
  for(const c of candidates){
    try{const {response,url}=await safeFetch(c.url,{method:'HEAD',headers:{'user-agent':UA,'accept':'application/json,application/xml,text/xml,*/*;q=0.1'},timeoutMs:4000,maxRedirects:2});if(response.status>=200&&response.status<400)found.push({...c,url,status:response.status,contentType:(response.headers.get('content-type')||'').toLowerCase()});}catch{}
  }
  return found;
}

async function inspectDomain(targetUrl,domainCache=defaultDomainCache){
  const u=new URL(targetUrl),key=u.origin;const hit=await domainCache.get(key);if(hit)return hit;
  const robots=await inspectRobots(u.origin,targetUrl);const commonEndpoints=await discoverOriginEndpoints(u.origin);
  return domainCache.put(key,{origin:u.origin,robots,commonEndpoints,observedAt:new Date().toISOString()});
}

async function negotiateMarkdown(url){
  try{
    const {response}=await safeFetch(url,{headers:{'user-agent':UA,'accept':'text/markdown, text/plain;q=0.9, text/html;q=0.3, */*;q=0.1','range':'bytes=0-131071'},timeoutMs:6000});
    const type=(response.headers.get('content-type')||'').toLowerCase();
    if(response.ok&&(type.includes('text/markdown')||type.includes('text/plain'))){const body=await response.arrayBuffer();return {available:true,url,accept:'text/markdown',contentType:type,bytes:body.byteLength,estimatedTokens:textTokenEstimate(new TextDecoder().decode(body).length)};}
  }catch{}
  return {available:false};
}

function parseLinkHeader(header,base){
  const out=[];
  for(const part of String(header||'').split(/,(?=\s*<)/)){
    const m=/<([^>]+)>/.exec(part);if(!m)continue;const url=absolute(m[1],base);if(!url)continue;
    const type=/type\s*=\s*["']?([^;"']+)/i.exec(part)?.[1]?.trim()?.toLowerCase()||'';
    const rel=/rel\s*=\s*["']?([^;"']+)/i.exec(part)?.[1]?.trim()?.toLowerCase()||'';
    if(rel.includes('alternate')||type.includes('json')||type.includes('xml')||type.includes('markdown')||type.includes('rss')||type.includes('atom'))out.push({kind:'link-header',type:type||rel||'alternate',url});
  }
  return out;
}

function chooseMachineEndpoint(endpoints){
  const rank=e=>e.kind==='negotiated-markdown'?0:(String(e.type).includes('json')||e.kind==='openapi'?1):(String(e.type).includes('markdown')?2):(e.kind==='advertised-alternate'?3):9;
  return [...endpoints].sort((a,b)=>rank(a)-rank(b))[0]||null;
}

function routeDecision({reachable,status,contentType,html,bytes,machineEndpoints,robots}){
  if(robots?.allowed===false)return {route:'AVOID',reason:'robots.txt disallows this path for PREFLIGHT.',confidence:.98};
  if(!reachable||status>=500)return {route:'AVOID',reason:'Destination did not return a usable response.',confidence:.9};
  if(status===401)return {route:'AVOID',reason:'Destination requires authentication.',confidence:.97};
  if(status===402)return {route:'AVOID',reason:'Destination requires payment (HTTP 402).',confidence:.99};
  if(status===403&&!html?.captcha)return {route:'AVOID',reason:'Destination denied direct access.',confidence:.92};
  if(status===429)return {route:'AVOID',reason:'Destination is rate limiting requests.',confidence:.95};
  if(machineEndpoints?.length)return {route:'MACHINE_ENDPOINT',reason:'A machine-friendly route is available and should be tried before browser rendering.',confidence:.93};
  if(contentType.includes('json')||contentType.includes('xml')||contentType.includes('text/plain')||contentType.includes('markdown'))return {route:'HTTP',reason:'The URL already returns machine-friendly content.',confidence:.97};
  if(html?.captcha)return {route:'BROWSER',reason:'Challenge/CAPTCHA markers suggest a browser may be required.',confidence:.86};
  if(html?.jsLikely)return {route:'BROWSER',reason:'The response looks like a JavaScript application shell with little server-rendered text.',confidence:.84};
  if(bytes>2_000_000)return {route:'HTTP',reason:'Direct HTTP works, but the response is large; selective extraction is recommended.',confidence:.84};
  return {route:'HTTP',reason:'The page is directly reachable and appears usable without browser rendering.',confidence:.86};
}

export async function probeUrl(input,{domainCache=defaultDomainCache}={}){
  const started=Date.now();let fetched;
  try{fetched=await safeFetch(input,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5','range':'bytes=0-2097151'}});}catch(e){return {url:input,reachable:false,error:{code:e?.code||'PREFLIGHT_FETCH',message:e?.name==='AbortError'?'Fetch timed out':e.message},bestRoute:'AVOID',reason:'PREFLIGHT could not safely reach the destination.',confidence:.95,latencyMs:Date.now()-started,observedAt:new Date().toISOString()};}
  const {response,url,redirectChain}=fetched;const contentType=(response.headers.get('content-type')||'').toLowerCase();const body=await response.arrayBuffer();const bytes=body.byteLength;const text=new TextDecoder('utf-8',{fatal:false}).decode(body);const html=contentType.includes('html')?parseHtml(text,url):null;
  const domain=await inspectDomain(url,domainCache);let markdown={available:false};if(contentType.includes('html')&&response.ok)markdown=await negotiateMarkdown(url);
  const advertised=uniq([...(html?.machine||[]),...parseLinkHeader(response.headers.get('link'),url)]);
  const originMachine=(domain.commonEndpoints||[]).filter(x=>x.kind!=='sitemap').map(x=>({...x,type:x.contentType||x.kind}));
  const machineEndpoints=uniq([...(markdown.available?[{kind:'negotiated-markdown',type:markdown.contentType,url:markdown.url,accept:markdown.accept,estimatedTokens:markdown.estimatedTokens}]:[]),...advertised,...originMachine]);
  const reachable=response.status>0&&response.status<500;const robots=domain.robots?.raw?{...domain.robots,...robotsDecision(domain.robots.raw,url)}:domain.robots;
  const decision=routeDecision({reachable,status:response.status,contentType,html,bytes,machineEndpoints,robots});const recommended=decision.route==='MACHINE_ENDPOINT'?chooseMachineEndpoint(machineEndpoints):null;
  const normalTokens=textTokenEstimate(html?.textChars??text.length);const recommendedTokens=recommended?.estimatedTokens??null;
  return {url:input,finalUrl:url,reachable,status:response.status,bestRoute:decision.route,recommendedRoute:recommended,reason:decision.reason,confidence:decision.confidence,robots:{policy:robots?.policy??'unknown',allowed:robots?.allowed??null,matchedRule:robots?.matchedRule??null},access:{authentication:response.status===401||response.status===403||!!html?.login,payment:response.status===402||!!html?.paywall,captchaRisk:html?.captcha?'high':'low'},javascript:html?.jsLikely??null,content:{type:contentType||null,bytes,estimatedTokens:normalTokens,jsonLd:html?.jsonLd??0},machineEndpoints,domainHints:{origin:domain.origin,commonEndpoints:domain.commonEndpoints||[],cache:domain.cache??null},canonical:html?.canonical??null,redirects:redirectChain.length>1?redirectChain:[],savings:recommendedTokens?{estimatedTokenReduction:Math.max(0,normalTokens-recommendedTokens),estimatedPercent:normalTokens?Math.max(0,Math.round((1-recommendedTokens/normalTokens)*100)):0}:null,latencyMs:Date.now()-started,observedAt:new Date().toISOString()};
}
