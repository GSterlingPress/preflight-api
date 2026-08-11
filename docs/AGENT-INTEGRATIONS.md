# PREFLIGHT agent integration recipes

PREFLIGHT is intentionally one small primitive: **before an agent visits an unfamiliar URL, ask how the machine should approach it.**

## Generic MCP client

Remote Streamable HTTP server:

`https://preflight-api-production-01a2.up.railway.app/mcp`

The server exposes:

- `preflight_check`
- `preflight_feedback`

Recommended system/tool instruction:

> Before fetching or browser-rendering an unfamiliar URL, call `preflight_check`. Prefer the returned route. After attempting it, call `preflight_feedback` with success/failure when possible.

## Generic REST agent

```js
const base = 'https://preflight-api-production-01a2.up.railway.app';
const url = 'https://example.com';
const route = await fetch(`${base}/v1/check?url=${encodeURIComponent(url)}`).then(r => r.json());

if (route.bestRoute === 'HTTP') {
  // use direct HTTP
} else if (route.bestRoute === 'BROWSER') {
  // use browser automation
} else if (route.bestRoute === 'MACHINE_ENDPOINT') {
  // prefer route.machineEndpoints / discovered structured endpoint
} else {
  // avoid the fetch
}
```

## Browser/research agents

Insert PREFLIGHT immediately before the agent's normal URL-fetch/browser tool. It is not a replacement for retrieval; it is a routing decision before retrieval.

## Shopping agents

Call PREFLIGHT before opening product, checkout, account, or retailer URLs. A direct structured route may avoid expensive browser rendering; authentication/CAPTCHA/payment signals can tell the agent to switch strategy early.

## Coding agents

When generated code is about to scrape or browse a third-party URL, prefer a PREFLIGHT call first rather than assuming browser rendering is required.

## Feedback loop

After the agent attempts the recommended route, send:

```json
{
  "url": "https://example.com/",
  "route": "HTTP",
  "outcome": "success",
  "latencyMs": 172
}
```

to `POST /v1/feedback`, or call `preflight_feedback` through MCP. This is how PREFLIGHT's machine map improves from real agent outcomes.
