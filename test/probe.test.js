import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHtml,robotsDecision} from '../src/probe.js';

test('parseHtml discovers canonical, JSON-LD and machine alternates',()=>{
  const html=`<!doctype html><html><head>
    <link rel="canonical" href="/article">
    <link rel="alternate" type="application/json" href="/article.json">
    <script type="application/ld+json">{"@type":"Article"}</script>
  </head><body><main>Hello machine web</main></body></html>`;
  const x=parseHtml(html,'https://example.com/page');
  assert.equal(x.canonical,'https://example.com/article');
  assert.equal(x.jsonLd,1);
  assert.equal(x.machine[0].url,'https://example.com/article.json');
});

test('robotsDecision uses specific PREFLIGHT group before wildcard',()=>{
  const robots=`User-agent: *\nDisallow: /private\n\nUser-agent: preflight\nAllow: /private/public\nDisallow: /private`;
  assert.equal(robotsDecision(robots,'https://example.com/private/public/x').allowed,true);
  assert.equal(robotsDecision(robots,'https://example.com/private/secret').allowed,false);
});

test('robotsDecision honors longest matching allow rule',()=>{
  const robots=`User-agent: *\nDisallow: /docs\nAllow: /docs/public`;
  const x=robotsDecision(robots,'https://example.com/docs/public/a');
  assert.equal(x.allowed,true);
  assert.deepEqual(x.matchedRule,{type:'allow',path:'/docs/public'});
});
