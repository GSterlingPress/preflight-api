# PREFLIGHT for coding and AI agents

Use PREFLIGHT **before** an agent fetches, scrapes, or browser-renders an unfamiliar URL.

The core question is:

> What is the cheapest reliable machine route to this destination?

Call `preflight_check` with the destination URL. It returns one of:

- `HTTP` — ordinary HTTP is likely enough.
- `BROWSER` — browser rendering is likely needed.
- `MACHINE_ENDPOINT` — prefer a discovered machine-readable endpoint.
- `AVOID` — do not proceed with the current route because of access/safety signals.

When possible, report whether the chosen route worked with `preflight_feedback`. Aggregated route outcomes improve future recommendations.

Remote MCP endpoint:

`https://preflight-api-production-01a2.up.railway.app/mcp`

REST fallback:

`GET https://preflight-api-production-01a2.up.railway.app/v1/check?url=<encoded-url>`

Do not use PREFLIGHT as a crawler or content-retrieval service. It answers **how to approach a URL before retrieval**.
