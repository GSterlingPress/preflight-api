# Integrate PREFLIGHT

Choose the cheapest likely machine route—HTTP, browser, machine endpoint, or avoid—before an agent visits an unfamiliar URL.

## 30-second test

```bash
curl -s "https://preflight-api-production-01a2.up.railway.app/v1/check?url=https%3A%2F%2Fexample.com"
```

## Remote MCP

```text
https://preflight-api-production-01a2.up.railway.app/mcp
```

## Production

- REST/docs base: https://preflight-api-production-01a2.up.railway.app
- MCP: https://preflight-api-production-01a2.up.railway.app/mcp
- Repository: https://github.com/GSterlingPress/preflight-api

## Where it belongs

Put PREFLIGHT immediately before the machine decision it improves, inside agent tool wrappers, workflow engines, middleware, job runners, or backend orchestration. Keep the integration narrow and observable. Do not count health checks, validators, crawlers, or our own tests as adoption.

## Failure behavior

Treat this as an advisory/reliability service, not magical certainty. If it is unavailable or returns insufficient evidence, preserve your application's existing safe fallback and never upgrade UNKNOWN into certainty.
