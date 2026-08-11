# PREFLIGHT Public Deployment

PREFLIGHT is ready for Railway deployment from the `main` branch.

## Railway service

1. Create a new Railway service from `GSterlingPress/preflight-api`.
2. Use the repository `railway.json`; the service listens on Railway's `PORT` and health-checks `/ready`.
3. Add a Railway volume mounted at `/data`. PREFLIGHT automatically uses `/data` on Railway for URL cache, domain cache, and route-feedback evidence.
4. Set `PREFLIGHT_FEEDBACK_KEY` to a long random secret before accepting public feedback. `GET /v1/check` remains public; only `POST /v1/feedback` is protected when this variable is set.
5. Generate a public Railway domain.

## Verification

Check:

```bash
curl https://YOUR-DOMAIN/ready
curl 'https://YOUR-DOMAIN/v1/check?url=https%3A%2F%2Fexample.com%2F'
```

Then run the full route/feedback cycle from a trusted shell:

```bash
PREFLIGHT_LIVE_URL=https://YOUR-DOMAIN \
PREFLIGHT_FEEDBACK_KEY='YOUR_KEY' \
npm run smoke:live
```

The smoke test fails unless the live service successfully performs:

1. `/version`
2. `/ready`
3. a real `/v1/check`
4. an accepted `/v1/feedback`
5. another `/v1/check` showing that feedback evidence increased

This is the M1P5 launch acceptance test.
