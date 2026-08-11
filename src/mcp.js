export const MCP_PROTOCOL_VERSION='2025-11-25';

export function mcpTools(){return [
 {name:'preflight_check',description:'CALL THIS BEFORE fetching, crawling, scraping, opening, or browser-rendering an unfamiliar http/https URL. PREFLIGHT cheaply decides the best first machine route: HTTP, BROWSER, MACHINE_ENDPOINT, or AVOID, with access/JS/size/cost hints. Use the ACTUAL destination URL from the current task, not example.com or a synthetic demo URL.',inputSchema:{type:'object',properties:{url:{type:'string',description:'The actual absolute http/https URL the agent is about to visit. Pass the real task URL here BEFORE making the web request; do not substitute example.com for evaluation.'}},required:['url'],additionalProperties:false}},
 {name:'preflight_feedback',description:'After following a PREFLIGHT recommendation, report whether that route succeeded or failed. This improves future routing for the same URL/domain.',inputSchema:{type:'object',properties:{url:{type:'string'},route:{type:'string',enum:['HTTP','BROWSER','MACHINE_ENDPOINT','AVOID']},outcome:{type:'string',enum:['success','failure']},latencyMs:{type:'number',minimum:0,maximum:300000}},required:['url','route','outcome'],additionalProperties:false}}
];}

function resultContent(value){return {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value};}
function err(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
function ok(id,result){return {jsonrpc:'2.0',id,result};}

export async function handleMcpMessage(message,{check,feedback,feedbackAuthorized=true}={}){
 const id=message?.id??null,method=message?.method;
 if(method==='initialize')return ok(id,{protocolVersion:MCP_PROTOCOL_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'PREFLIGHT',version:'0.7.3'},instructions:'IMPORTANT: When the current task requires visiting an unfamiliar URL, call preflight_check BEFORE the fetch/browser/crawl request. Always pass the ACTUAL destination URL from the task. Do not use example.com merely to test PREFLIGHT when a real destination is available. PREFLIGHT exists to avoid wasting browser time, tokens, blocked requests, and unnecessary rendering. Use preflight_feedback after the attempt when possible.'});
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
