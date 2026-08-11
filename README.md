# PREFLIGHT

**Before your AI agent visits a URL, ask us how to get there.**

PREFLIGHT is a routing-intelligence API for browser/research/shopping agents. Given a URL, it returns the cheapest likely route to try first: `HTTP`, `BROWSER`, `MACHINE_ENDPOINT`, or `AVOID`.

The long-term product is a machine map of the web: not *what is on the web*, but *how should a machine interact with this destination?*

## Check a URL

```http
GET /v1/check?url=https://example.com
```

PREFLIGHT combines direct probe signals, cached domain knowledge, and sufficiently strong observed route feedback. Responses include a `feedback` block showing available evidence, any learned route, and whether that evidence changed the current recommendation.

## Report whether a route worked

```http
POST /v1/feedback
Content-Type: application/json
Authorization: Bearer <feedback-key>   # when protection is enabled
```

```json
{
  "url": "https://example.com/product/123",
  "route": "BROWSER",
  "outcome": "success",
  "latencyMs": 840
}
```

PREFLIGHT stores aggregated success/failure evidence rather than page content or user identities. URL-level learning requires at least 5 samples at 80% success; domain-level learning requires at least 10 samples at 85% success. Feedback never overrides a current `AVOID` decision from live safety/access/robots signals.

## M1P5 — Public deployment

Version 0.5 adds production launch plumbing:

- `GET /ready` verifies the feedback data directory is writable.
- Railway deployments automatically use `/data`; mount a Railway persistent volume there.
- `PREFLIGHT_FEEDBACK_KEY` optionally bearer-protects `POST /v1/feedback` while keeping `GET /v1/check` public.
- `npm run smoke:live` proves the full public cycle: version → readiness → route check → feedback receipt → evidence increase.
- `railway.json` health-checks `/ready`.

See `DEPLOYMENT.md` for the exact Railway setup.

## Routing intelligence

PREFLIGHT observes status, redirects, body shape, token estimate, JavaScript-shell hints, canonical URL, JSON-LD, access/challenge hints, robots rules, content negotiation, advertised alternates and common machine surfaces such as OpenAPI metadata. URL results use a short cache; reusable domain observations use a longer cache.

## Real-world benchmark

`benchmarks/sites.json` contains a cross-category live corpus. Run `npm run benchmark`. The scheduled benchmark records route, status, latency, token estimate and machine endpoints and preserves machine-readable reports for trend analysis.

## Safety boundary

PREFLIGHT blocks localhost, private/link-local network addresses, credential-bearing URLs, non-HTTP protocols, and unsafe redirect destinations. Endpoint discovery and negotiated probes go through the same SSRF-safe fetch layer. Route feedback cannot relax an active `AVOID` result.

## Run locally

Requires Node.js 20+.

```bash
npm test
npm start
```

## Environment

- `PORT` — server port (default `8080`)
- `HOST` — bind host (default `0.0.0.0`)
- `PREFLIGHT_DATA_DIR` — caches and aggregated feedback data; defaults to `/data` on Railway
- `PREFLIGHT_FEEDBACK_KEY` — optional bearer token protecting feedback writes
- `PREFLIGHT_CACHE_TTL_MS` — URL cache freshness window (default 15 minutes)
- `PREFLIGHT_DOMAIN_CACHE_TTL_MS` — domain observation freshness window (default 6 hours)

## Product boundary

PREFLIGHT is not a crawler, browser farm, search engine or site-owner audit tool. Its job is narrower:

> **URL in → cheapest reliable machine route out.**

M1P5 makes the routing and self-learning loop deployable as a persistent public service.
