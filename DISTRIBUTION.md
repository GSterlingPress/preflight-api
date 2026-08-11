# PREFLIGHT Distribution Kit

## One-line pitch
Before your AI agent visits a URL, ask PREFLIGHT how to get there.

PREFLIGHT is pre-fetch routing intelligence for AI agents: URL in -> HTTP, BROWSER, MACHINE_ENDPOINT, or AVOID out.

## Copy/paste launch post
AI agents waste time and tokens discovering how a website works *after* they start fetching it. PREFLIGHT moves that decision before the fetch.

Give it a URL and it recommends the cheapest likely machine route: ordinary HTTP, browser rendering, a machine-readable endpoint, or avoid.

Live REST API and remote MCP are public. Feedback lets successful/failed routes improve future recommendations.

Try it:
`GET https://preflight-api-production-01a2.up.railway.app/v1/check?url=https://example.com`

Repo: https://github.com/GSterlingPress/preflight-api

## Attribution standard
For direct REST integrations, send `X-Preflight-Source` and optionally `X-Preflight-Campaign`. These labels are recorded with privacy-safe activity telemetry and let us measure which distribution channels produce real usage.

Example:
`curl -H 'X-Preflight-Source: github' -H 'X-Preflight-Campaign: m2p4' 'https://preflight-api-production-01a2.up.railway.app/v1/check?url=https://example.com'`

Recommended source labels: `github`, `mcp-registry`, `glama`, `smithery`, `pulsemcp`, `mcp-so`, `hackernews`, `reddit`, `devto`, `linkedin`, `direct`.

For clickable human links where custom headers are unavailable, use a landing/check URL with ordinary UTM parameters for human analytics; API attribution should prefer the headers above because PREFLIGHT intentionally does not retain full target URLs.

## Short social version
What if AI agents didn't have to rediscover how every website works?

PREFLIGHT: URL in -> HTTP / BROWSER / MACHINE_ENDPOINT / AVOID out.

A tiny routing layer before the expensive web request.
https://github.com/GSterlingPress/preflight-api

## Hacker News / technical community version
**PREFLIGHT: pre-fetch routing intelligence for AI agents**

Browser/research agents routinely discover whether a destination needs JS, browser rendering, auth, structured endpoints, or should be avoided only after attempting retrieval. PREFLIGHT makes that a separate cheap decision.

The API takes a URL and returns a recommended route plus evidence such as reachability, redirects, access hints, estimated token size, structured-data signals, machine endpoints, latency, confidence and cache age.

The service also accepts route outcome feedback, allowing repeated observations to become shared routing knowledge rather than every agent rediscovering the same domain behavior.

Public REST + remote MCP. The current version is intentionally small and experimental.

## Search phrases to use naturally
AI agent URL routing; browser agent preflight; HTTP vs browser for AI agents; reduce browser-agent tokens; machine endpoint discovery; pre-fetch routing; agent web infrastructure; MCP web routing.

## Integration trigger
If your agent is about to fetch or browser-render an unfamiliar URL, call PREFLIGHT first.

## Public endpoints
REST: https://preflight-api-production-01a2.up.railway.app/v1/check
MCP: https://preflight-api-production-01a2.up.railway.app/mcp
Activity: https://preflight-api-production-01a2.up.railway.app/activity

## Distribution targets
- MCP ecosystem listings and clients
- AI-agent framework examples
- browser-agent and web-agent communities
- developer newsletters/directories
- Hacker News / Show HN
- relevant Reddit communities, with useful technical context rather than link spam
- GitHub search/discovery
- AI infrastructure discussions where HTTP-vs-browser cost is relevant

## 100-check scoreboard
Milestone A: 1 real external URL check — achieved before durable telemetry rollout.
Milestone B: 10 attributable external URL checks.
Milestone C: 25 attributable external URL checks.
Milestone D: 50 attributable external URL checks.
Milestone E: 100 attributable external URL checks.

Do not count our own CI, health checks, dashboard requests, or deliberate acceptance tests as customer usage.

## Rule
Lead with the problem and a runnable example. Do not claim adoption, savings, or reliability numbers we have not measured.
