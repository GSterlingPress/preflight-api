import dns from 'node:dns/promises';
import net from 'node:net';

function privateIPv4(ip){
  const p=ip.split('.').map(Number);if(p.length!==4)return false;
  return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]>=224);
}
function privateIPv6(ip){const x=ip.toLowerCase();return x==='::1'||x==='::'||x.startsWith('fe80:')||x.startsWith('fc')||x.startsWith('fd');}
export async function assertPublicUrl(value){
  let u;try{u=new URL(value)}catch{throw Object.assign(new Error('Invalid URL'),{code:'PREFLIGHT_BAD_URL'})}
  if(!['http:','https:'].includes(u.protocol))throw Object.assign(new Error('Only http/https URLs are allowed'),{code:'PREFLIGHT_BAD_URL'});
  if(u.username||u.password)throw Object.assign(new Error('Credential-bearing URLs are not allowed'),{code:'PREFLIGHT_BAD_URL'});
  const literal=net.isIP(u.hostname);
  const addresses=literal?[{address:u.hostname,family:literal}]:await dns.lookup(u.hostname,{all:true,verbatim:true});
  if(!addresses.length)throw Object.assign(new Error('Hostname did not resolve'),{code:'PREFLIGHT_DNS'});
  for(const {address,family} of addresses){if((family===4&&privateIPv4(address))||(family===6&&privateIPv6(address)))throw Object.assign(new Error('Private/local network targets are blocked'),{code:'PREFLIGHT_UNSAFE_URL'});}
  return u;
}

export async function safeFetch(value,{method='GET',headers={},maxRedirects=5,timeoutMs=8000}={}){
  let current=(await assertPublicUrl(value)).href;
  const chain=[];
  for(let i=0;i<=maxRedirects;i++){
    await assertPublicUrl(current);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let response;try{response=await fetch(current,{method,headers,redirect:'manual',signal:controller.signal});}finally{clearTimeout(timer)}
    chain.push({url:current,status:response.status});
    if([301,302,303,307,308].includes(response.status)&&response.headers.get('location')){
      if(i===maxRedirects)throw Object.assign(new Error('Too many redirects'),{code:'PREFLIGHT_REDIRECT'});
      current=new URL(response.headers.get('location'),current).href;continue;
    }
    return {response,url:current,redirectChain:chain};
  }
}
