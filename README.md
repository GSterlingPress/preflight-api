# PREFLIGHT

**Before your AI agent visits a URL, ask us how to get there.**

PREFLIGHT is a routing-intelligence API for browser/research/shopping agents. Given a URL, it returns the cheapest likely route to try first:

- `HTTP`
- `BROWSER`
- `MACHINE_ENDPOINT`
- `AVOID`

The long-term product is a machine map of the web: not *what is on the web*, but *how should a machine interact with this destination?*

## Check a URL

```http
GET /v1/check?url=https://example.com
```

PREFLIGHT combines direct probe signals, cached domain knowledge, and sufficiently strong observed route feedback. Responses now include a `feedback` block showing the evidence available, any learned route, and whether that evidence changed the current recommendation.

## Report whether a route worked

```http
POST /v1/feedback
Content-Type: application/json
```

```json
{
  "url": "https://example.com/product/123",
  "route": "BROWSER",
  "outcome": "success",
  "latencyMs": 840
}
```

`route` must be one of `HTTP`, `BROWSER`, `MACHINE_ENDPOINT`, or `AVOID`. `outcome` is `success` or `failure`.

PREFLIGHT does not need the page content or a user identity. It stores aggregated success/failure counts by hashed URL and domain-level route evidence. Domain origins are retained so domain observations can remain operationally useful; raw per-event histories are not required for the learning loop.

## M1P4 — Self-learning route feedback

The feedback layer is intentionally conservative:

- URL-level learning requires at least **5** samples and at least **80%** success for a route.
- Domain-level learning requires at least **10** samples and at least **85%** success.
- URL evidence is preferred over broader domain evidence.
- Feedback can improve `HTTP`, `BROWSER`, or `MACHINE_ENDPOINT` recommendations.
- Feedback **never overrides a current `AVOID`** decision from live safety/access/robots signals.
- Cached probe results are re-enriched with current feedback on every check, so newly learned evidence can affect a recommendation without waiting for the URL cache to expire.

That creates the first Waze-like loop:

> PREFLIGHT recommends → agent tries route → agent reports outcome → future agents receive a better route.

## Routing intelligence

PREFLIGHT observes URL-level and reusable domain-level signals including status, redirects, body shape, token estimate, JavaScript-shell hints, canonical URL, JSON-LD, access/challenge hints, robots rules, content negotiation, advertised alternates and common machine surfaces such as OpenAPI metadata.

URL results use a short cache. Domain observations use a longer cache, so expensive learning can be shared across many URL checks.

## Real-world benchmark

`benchmarks/sites.json` contains a cross-category live corpus. Run:

```bash
npm run benchmark
```

The benchmark records observed route, status, latency, token estimate and machine endpoints; scores flexible and strict-control cases separately; and writes machine-readable reports to `benchmark-results/`. A GitHub Actions workflow also runs the live benchmark on a schedule.

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
- `PREFLIGHT_DATA_DIR` — caches and aggregated feedback data
- `PREFLIGHT_CACHE_TTL_MS` — URL cache freshness window (default 15 minutes)
- `PREFLIGHT_DOMAIN_CACHE_TTL_MS` — domain observation freshness window (default 6 hours)

## Product boundary

PREFLIGHT is not a crawler, browser farm, search engine or site-owner audit tool. Its job is narrower:

> **URL in → cheapest reliable machine route out.**

M1P4 adds the network-effect loop that can make those answers improve as agents use them.
