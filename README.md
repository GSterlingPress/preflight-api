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

PREFLIGHT 0.2 adds two observation layers:

1. **URL observations** — status, redirects, body shape, token estimate, JavaScript shell, canonical URL, JSON-LD, challenge/auth/payment hints and advertised alternates.
2. **Domain observations** — robots rules plus reusable discovery of common machine surfaces such as OpenAPI, AI-plugin metadata and sitemap presence.

URL results use a short cache. Domain observations use a longer cache, so the expensive work of learning a site's machine characteristics is shared across many URL checks.

## Route intelligence in 0.2

PREFLIGHT now includes:

- path-aware `robots.txt` interpretation, including specific `PREFLIGHT` rules and longest-rule precedence
- reusable domain-level observations
- content negotiation for `text/markdown`
- HTML `<link rel="alternate">` discovery
- HTTP `Link` header discovery
- lightweight discovery of `/openapi.json`, `/.well-known/ai-plugin.json`, and `/sitemap.xml`
- recommended machine endpoint when one is available
- estimated token reduction when a smaller negotiated representation can be measured
- improved classification confidence for HTTP, browser, machine-endpoint and avoid routes

Example shape:

```json
{
  "bestRoute": "MACHINE_ENDPOINT",
  "recommendedRoute": {
    "kind": "negotiated-markdown",
    "url": "https://example.com/docs",
    "accept": "text/markdown"
  },
  "robots": {
    "policy": "allowed",
    "allowed": true
  },
  "content": {
    "type": "text/html",
    "bytes": 120000,
    "estimatedTokens": 9000,
    "jsonLd": 1
  },
  "machineEndpoints": [],
  "savings": {
    "estimatedTokenReduction": 6200,
    "estimatedPercent": 69
  }
}
```

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

M1P2 makes that routing answer materially smarter while keeping the service tiny and cache-friendly.
