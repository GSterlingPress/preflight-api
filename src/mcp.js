export const MCP_PROTOCOL_VERSION='2025-11-25';

export function mcpTools(){return [
 {name:'preflight_check',title:'Check URL Before Fetching',description:'Before fetching, crawling, scraping, opening, or browser-rendering an unfamiliar http/https URL, call this with the ACTUAL destination URL. Returns the best first route: HTTP, BROWSER, MACHINE_ENDPOINT, or AVOID, plus access/JS/size/cost hints. Do not substitute example.com when a real task URL is available.',annotations:{title:'Check URL Before Fetching',readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},inputSchema:{type:'object',properties:{url:{type:'string',format:'uri',description:'Actual absolute http/https destination URL from the current task. Use before the first fetch or browser request.'}},required:['url'],additionalProperties:false}},
 {name:'preflight_feedback',title:'Report PREFLIGHT Outcome',description:'After following a PREFLIGHT recommendation, report whether the chosen route worked so PREFLIGHT can improve future recommendations.',annotations:{title:'Report PREFLIGHT Outcome',readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},route:{type:'string',enum:['HTTP','BROWSER','MACHINE_ENDPOINT','AVOID']},outcome:{type:'string',enum:['success','failure']},latencyMs:{type:'number',minimum:0,maximum:300000}},required:['url','route','outcome'],additionalProperties:false}}
];}
function resultContent(value){return {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value};}
function err(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
function ok(id,result){return {jsonrpc:'2.0',id,result};}
export async function handleMcpMessage(message,{check,feedback,feedbackAuthorized=true}={}){
 const id=message?.id??null,method=message?.method;
 if(method==='initialize')return ok(id,{protocolVersion:MCP_PROTOCOL_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'PREFLIGHT',version:'0.7.4'},instructions:'When a task requires visiting an unfamiliar http/https URL, call preflight_check BEFORE the first fetch, browser, crawl, or scrape attempt. Pass the ACTUAL destination URL from the task. PREFLIGHT is a cheap routing decision, not the fetch itself: it returns HTTP, BROWSER, MACHINE_ENDPOINT, or AVOID. Do not use example.com when a real destination is available. Use preflight_feedback after the attempt when possible.'});
 if(method==='notifications/initialized')return null;
 if(method==='ping')return ok(id,{});
 if(method==='tools/list')return ok(id,{tools:mcpTools()});
 if(method==='tools/call'){
   const name=message?.params?.name,args=message?.params?.arguments??{};
   try{
     if(name==='preflight_check')return ok(id,resultContent(await check(args.url)));
     if(name==='preflight_feedback'){
       if(!feedbackAuthorized)return err(id,-32001,'Valid bearer token required for feedback');
       return ok(id,resultContent(await feedback(args)));
     }
     return err(id,-32602,'Unknown tool');
   }catch(e){return ok(id,{content:[{type:'text',text:e instanceof Error?e.message:'Tool failed'}],isError:true});}
 }
 return err(id,-32601,'Method not found');
}
