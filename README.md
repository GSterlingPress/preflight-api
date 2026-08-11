# PREFLIGHT

**Before your AI agent visits a URL, ask us how to get there.**

PREFLIGHT is routing intelligence for browser, research and shopping agents. Given a URL, it recommends the cheapest likely route to try first: `HTTP`, `BROWSER`, `MACHINE_ENDPOINT`, or `AVOID`.

The long-term product is a machine map of the web: not *what is on the web*, but *how should a machine interact with this destination?*

## Live service

Base URL:

`https://preflight-api-production-01a2.up.railway.app`

REST — use the **actual URL your agent is about to visit**:

```http
GET /v1/check?url=<encoded-actual-destination-url>
```

For example, if your agent is about to inspect a product, documentation page, article, booking page, or SaaS site, pass that real destination to PREFLIGHT first. `example.com` is only a documentation placeholder and should not be used when a real task URL exists.

Remote MCP:

`https://preflight-api-production-01a2.up.railway.app/mcp`

The MCP server exposes two tools:

- `preflight_check` — call this **before fetching or browser-rendering an unfamiliar real URL**.
- `preflight_feedback` — report whether the chosen route worked so PREFLIGHT can improve future recommendations.

Example tool intent:

> Before opening the URL from my current task, use PREFLIGHT to decide whether ordinary HTTP, a browser, a machine-readable endpoint, or avoidance is the best first route.

## Why an agent should call PREFLIGHT

Fetching first can be wasteful. A destination may be directly readable over HTTP, require browser rendering, expose a smaller machine endpoint, block automation, require authentication/payment, or carry access signals that make a fetch undesirable. PREFLIGHT tries to answer that routing question before the expensive step.

Responses combine direct probe signals, cached domain knowledge, and sufficiently strong observed route feedback. They can include status, redirects, robots/access hints, estimated token size, JavaScript-shell hints, structured-data signals, machine endpoints, latency, confidence, cache age, and learned route evidence.

## Feedback loop

```http
POST /v1/feedback
Content-Type: application/json
Authorization: Bearer <feedback-key>   # when protection is enabled
```

```json
{
  "url": "https://merchant.example/product/123",
  "route": "BROWSER",
  "outcome": "success",
  "latencyMs": 840
}
```

PREFLIGHT stores aggregated success/failure evidence rather than page content or user identities. URL-level learning requires at least 5 samples at 80% success; domain-level learning requires at least 10 samples at 85% success. Feedback never overrides a current `AVOID` decision from live safety/access/robots signals.

## Agent discovery

- `AGENTS.md` tells coding/AI agents exactly when to use PREFLIGHT.
- `llms.txt` gives LLMs a compact machine-readable explanation, live endpoints, and usage rule.
- `openapi.json` exposes REST operations in OpenAPI 3.1 format for tool importers and generated clients.
- `mcp.json` contains a generic remote MCP client configuration.
- `docs/AGENT-INTEGRATIONS.md` contains copy/paste integration patterns for browser, research, shopping, coding, MCP, and REST agents.
- `server.json` contains official MCP Registry metadata for the public Streamable HTTP server.
- `/mcp` supports MCP initialize, initialized notification, ping, `tools/list`, and `tools/call`.
- The ordinary REST endpoint remains available for clients that do not use MCP.

Search/discovery concepts: **AI agent URL routing**, **browser-agent preflight**, **choose HTTP vs browser**, **machine-readable endpoint discovery**, **reduce agent browsing tokens**, **agent web routing**, **pre-fetch routing intelligence**, **AI browser cost reduction**, **route before crawl**, **agent URL access intelligence**.

## Public deployment

`GET /ready` verifies the data directory is writable. Railway deployments use `/data`; mount a persistent volume there when long-term feedback persistence is required. `PREFLIGHT_FEEDBACK_KEY` optionally bearer-protects feedback writes while keeping route checks public. `npm run smoke:live` exercises the public route/feedback cycle.

## Real-world benchmark

`benchmarks/sites.json` contains a cross-category live corpus. Run `npm run benchmark`. The scheduled benchmark records route, status, latency, token estimate and machine endpoints and preserves machine-readable reports for trend analysis.

## Safety boundary

PREFLIGHT blocks localhost, private/link-local network addresses, credential-bearing URLs, non-HTTP protocols, and unsafe redirect destinations. Endpoint discovery and negotiated probes go through the same SSRF-safe fetch layer. MCP validates browser Origins, and route feedback cannot relax an active `AVOID` result.

## Run locally

Requires Node.js 20+.

```bash
npm test
npm start
```

## Product boundary

PREFLIGHT is not a crawler, browser farm, search engine or site-owner audit tool. Its job is narrower:

> **Real URL in → cheapest reliable machine route out.**
