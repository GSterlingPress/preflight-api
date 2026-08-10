# PREFLIGHT

**Before your AI agent visits a URL, ask us how to get there.**

PREFLIGHT is a routing-intelligence API for browser/research/shopping agents. Given a URL, it returns the cheapest likely route to try first:

- `HTTP`
- `BROWSER`
- `MACHINE_ENDPOINT`
- `AVOID`

The long-term product is a machine map of the web: not *what is on the web*, but *how should a machine interact with this destination?*

## M1P1 API

```http
GET /v1/check?url=https://example.com
```

Example response:

```json
{
  "url": "https://example.com",
  "reachable": true,
  "status": 200,
  "bestRoute": "HTTP",
  "reason": "The page is directly reachable and appears usable without browser rendering.",
  "confidence": 0.82,
  "robots": "not_globally_blocked",
  "access": {
    "authentication": false,
    "payment": false,
    "captchaRisk": "low"
  },
  "javascript": false,
  "content": {
    "type": "text/html",
    "bytes": 12560,
    "estimatedTokens": 710
  },
  "machineEndpoints": [],
  "cache": {
    "hit": false
  }
}
```

## What V0.1 measures

PREFLIGHT currently observes:

- reachability and HTTP status
- redirect chain and final URL
- robots.txt global-block signal
- authentication/payment status hints
- CAPTCHA/challenge markers
- likely JavaScript-shell behavior
- content type and fetched size
- approximate downstream token cost
- JSON-LD presence
- canonical URL
- advertised alternate machine-readable endpoints (RSS/Atom/JSON/Markdown where exposed)
- a normalized route recommendation with reason/confidence

Answers are cached on disk with a configurable TTL so repeated checks can become extremely cheap.

## Safety boundary

PREFLIGHT is an outbound URL service, so V0.1 blocks localhost, private/link-local network addresses, credential-bearing URLs, non-HTTP protocols, and unsafe redirect destinations. This is intentionally part of M1P1 rather than postponed.

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
- `PREFLIGHT_CACHE_TTL_MS` — cache freshness window (default 15 minutes)

## M1P1 definition

**Input:** URL.

**Output:** `HTTP | BROWSER | MACHINE_ENDPOINT | AVOID`, plus the small set of signals needed to explain the choice.

No dashboard, billing, accounts, browser farm, or AI model yet. The purpose of M1P1 is to prove the routing primitive itself.
