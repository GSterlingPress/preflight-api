export function scoreObservation(site,result){
  const acceptable=site.acceptableRoutes||[];
  const actual=result?.bestRoute||'ERROR';
  const routeMatch=acceptable.includes(actual);
  const confidence=Number(result?.confidence||0);
  return {
    id:site.id,
    category:site.category,
    url:site.url,
    expectedRoutes:acceptable,
    actualRoute:actual,
    routeMatch,
    confidence:Number.isFinite(confidence)?confidence:0,
    reachable:result?.reachable??false,
    status:result?.status??null,
    latencyMs:result?.latencyMs??null,
    estimatedTokens:result?.content?.estimatedTokens??null,
    machineEndpoints:result?.machineEndpoints?.length??0,
    recommendedRoute:result?.recommendedRoute??null,
    savings:result?.savings??null,
    reason:result?.reason??result?.error?.message??'No result',
    error:result?.error??null
  };
}

export function summarizeBenchmark(rows){
  const total=rows.length;
  const matched=rows.filter(r=>r.routeMatch).length;
  const errors=rows.filter(r=>r.error).length;
  const strict=rows.filter(r=>r.expectedRoutes.length===1);
  const strictMatched=strict.filter(r=>r.routeMatch).length;
  const byCategory={};
  for(const row of rows){
    const bucket=byCategory[row.category]??={total:0,matched:0};
    bucket.total++;if(row.routeMatch)bucket.matched++;
  }
  for(const bucket of Object.values(byCategory))bucket.accuracy=bucket.total?bucket.matched/bucket.total:0;
  return {
    total,
    matched,
    accuracy:total?matched/total:0,
    strictCases:strict.length,
    strictMatched,
    strictAccuracy:strict.length?strictMatched/strict.length:0,
    errors,
    byCategory
  };
}
