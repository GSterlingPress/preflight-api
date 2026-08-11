const base=(process.env.PREFLIGHT_LIVE_URL||process.argv[2]||'').replace(/\/$/,'');
if(!base)throw new Error('Set PREFLIGHT_LIVE_URL or pass the public base URL as argv[2].');
const feedbackKey=process.env.PREFLIGHT_FEEDBACK_KEY||'';
const target=process.env.PREFLIGHT_SMOKE_TARGET||'https://example.com/';

async function json(url,options={}){
  const r=await fetch(url,options);const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={raw:text}}
  if(!r.ok)throw new Error(`${r.status} ${url}: ${JSON.stringify(body)}`);return {r,body};
}

const version=(await json(`${base}/version`)).body;
const ready=(await json(`${base}/ready`)).body;
const first=(await json(`${base}/v1/check?url=${encodeURIComponent(target)}`)).body;
const route=first.bestRoute;
const before=first.feedback?.evidence?.url?.routes?.[route]?.total||0;
const headers={'content-type':'application/json'};if(feedbackKey)headers.authorization=`Bearer ${feedbackKey}`;
const posted=(await json(`${base}/v1/feedback`,{method:'POST',headers,body:JSON.stringify({url:target,route,outcome:'success',latencyMs:first.latencyMs??null})})).body;
const second=(await json(`${base}/v1/check?url=${encodeURIComponent(target)}`)).body;
const after=second.feedback?.evidence?.url?.routes?.[route]?.total||0;
if(after<before+1)throw new Error(`Feedback evidence did not increase: before=${before}, after=${after}`);
console.log(JSON.stringify({ok:true,base,version:version.version,ready:ready.ready,target,route,feedbackAccepted:posted.accepted,evidenceBefore:before,evidenceAfter:after,cache:second.cache?.hit??null},null,2));
