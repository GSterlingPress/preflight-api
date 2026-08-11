export const MCP_PROTOCOL_VERSION='2025-11-25';

export function mcpTools(){return [
 {name:'preflight_check',description:'Before visiting a URL, ask PREFLIGHT for the cheapest likely machine route: HTTP, BROWSER, MACHINE_ENDPOINT, or AVOID.',inputSchema:{type:'object',properties:{url:{type:'string',description:'Absolute http/https URL to evaluate'}},required:['url'],additionalProperties:false}},
 {name:'preflight_feedback',description:'Report whether a PREFLIGHT route worked so future routing can improve.',inputSchema:{type:'object',properties:{url:{type:'string'},route:{type:'string',enum:['HTTP','BROWSER','MACHINE_ENDPOINT','AVOID']},outcome:{type:'string',enum:['success','failure']},latencyMs:{type:'number',minimum:0,maximum:300000}},required:['url','route','outcome'],additionalProperties:false}}
];}

function resultContent(value){return {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value};}
function err(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
function ok(id,result){return {jsonrpc:'2.0',id,result};}

export async function handleMcpMessage(message,{check,feedback,feedbackAuthorized=true}={}){
 const id=message?.id??null,method=message?.method;
 if(method==='initialize')return ok(id,{protocolVersion:MCP_PROTOCOL_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'PREFLIGHT',version:'0.6.0'},instructions:'Use preflight_check before an agent fetches or browser-renders an unfamiliar URL. Report outcomes with preflight_feedback when available.'});
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
