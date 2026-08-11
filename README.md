# PREFLIGHT

**Before your AI agent visits a URL, ask us how to get there.**

PREFLIGHT is a routing-intelligence API for browser/research/shopping agents. Given a URL, it returns the cheapest likely route to try first:

- `HTTP`
- `BROWSER`
- `MACHINE_ENDPOINT`
- `AVOID`

The long-term product is a machine map of the web: not *what is on the web*, but *how should a machine interact with this destination?*

## API

```http
GET /v1/check?url=https://example.com
```

PREFLIGHT 0.3 keeps the 0.2 routing engine and adds a real-world benchmark layer so route quality can be measured against changing web behavior instead of judged by anecdotes.

## Routing intelligence

PREFLIGHT observes URL-level and reusable domain-level signals including status, redirects, body shape, token estimate, JavaScript-shell hints, canonical URL, JSON-LD, access/challenge hints, robots rules, content negotiation, advertised alternates and common machine surfaces such as OpenAPI metadata.

URL results use a short cache. Domain observations use a longer cache, so the expensive work of learning a site's machine characteristics is shared across many URL checks.

## M1P3 — Real-world benchmark

The repository now includes `benchmarks/sites.json`, a cross-category corpus covering static HTML, documentation, direct JSON APIs, feeds, community sites, commerce, JS-heavy frontends, publishers, authentication/denial/rate-limit/server-error controls and redirects.

Run the benchmark with:

```bash
npm run benchmark
```

The runner:

- probes each target using the production routing engine
- records the observed route, status, latency, token estimate, machine endpoints and recommendation
- compares the result to one or more acceptable routes rather than pretending volatile websites have a permanent single answer
- separately scores strict control cases where only one route is acceptable
- writes machine-readable JSON reports to `benchmark-results/`
- does **not** fail simply because a live website changes behavior

GitHub Actions runs the deterministic unit suite on every change. A separate live benchmark workflow can be dispatched manually and is scheduled weekly; its JSON observations are retained as workflow artifacts for trend analysis.

Environment options:

- `PREFLIGHT_BENCHMARK_LIMIT` — run only the first N corpus entries
- `PREFLIGHT_BENCHMARK_CATEGORY` — run one benchmark category
- `PREFLIGHT_BENCHMARK_OUT` — choose the report directory

## Safety boundary

PREFLIGHT blocks localhost, private/link-local network addresses, credential-bearing URLs, non-HTTP protocols, and unsafe redirect destinations. Endpoint discovery and negotiated probes go through the same SSRF-safe fetch layer.

## Run locally

Requires Node.js 20+.

```bash
npm test
npm start
```

Then:

```bash
curl 'http://localhost:8080/v1/check?url=https%3A%2F%2Fexample.com'
```

## Environment

- `PORT` — server port (default `8080`)
- `HOST` — bind host (default `0.0.0.0`)
- `PREFLIGHT_DATA_DIR` — cache directory
- `PREFLIGHT_CACHE_TTL_MS` — URL cache freshness window (default 15 minutes)
- `PREFLIGHT_DOMAIN_CACHE_TTL_MS` — domain observation freshness window (default 6 hours)

## Product boundary

PREFLIGHT is not a crawler, browser farm, search engine or site-owner audit tool. Its job is narrower:

> **URL in → cheapest reliable machine route out.**

M1P3 adds the evidence loop needed to improve that routing answer against the real web over time.
