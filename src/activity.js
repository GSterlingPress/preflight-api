import crypto from 'node:crypto';

const MAX_EVENTS=5000;
const BOT_TEST_RE=/(github-actions|preflight-registry-check|curl|railway|healthcheck)/i;
function day(ts){return new Date(ts).toISOString().slice(0,10)}
function hash(value){return crypto.createHash('sha256').update(String(value||'unknown')).digest('hex').slice(0,12)}
function source(req){const ua=String(req.headers['user-agent']||'unknown');const explicit=String(req.headers['x-preflight-source']||'').trim();if(explicit)return explicit.slice(0,64);if(/modelcontextprotocol|mcp/i.test(ua))return 'mcp-client';if(/github/i.test(ua))return 'github';return 'direct';}
function internal(req){const ua=String(req.headers['user-agent']||'');return String(req.headers['x-preflight-internal']||'')==='1'||BOT_TEST_RE.test(ua)}
export class ActivityStore{
 constructor(){this.events=[]}
 record(req,{kind,route=null,target=null,status=200}={}){const now=Date.now();const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();const caller=hash(forwarded||req.socket?.remoteAddress||req.headers['user-agent']);const event={id:crypto.randomUUID(),at:new Date(now).toISOString(),kind,route,status,source:source(req),caller,external:!internal(req)};if(target){try{event.host=new URL(target).host}catch{}}this.events.unshift(event);if(this.events.length>MAX_EVENTS)this.events.length=MAX_EVENTS;return event}
 snapshot(){const today=day(Date.now());const all=this.events;const external=all.filter(e=>e.external);const todays=external.filter(e=>e.at.slice(0,10)===today);return {service:'PREFLIGHT',generatedAt:new Date().toISOString(),external:{callsToday:todays.length,uniqueCallersToday:new Set(todays.map(e=>e.caller)).size,mcpCallsToday:todays.filter(e=>e.kind==='mcp').length,checksToday:todays.filter(e=>e.kind==='check').length,feedbackToday:todays.filter(e=>e.kind==='feedback').length,lastCall:external[0]?.at||null},all:{callsToday:all.filter(e=>e.at.slice(0,10)===today).length},feed:external.slice(0,50)}}
}
