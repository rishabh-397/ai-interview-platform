# Load Testing — AI Interview Platform

## Setup
1. Install k6 (free, no account needed): https://k6.io/docs/get-started/installation/
   - Windows: `choco install k6` or download the .exe from the releases page
2. Make sure your Docker stack is running (`docker compose up`)

## Run it
```powershell
cd load-tests
k6 run load-test.js
```

To point at a real login account instead of the placeholder:
```powershell
k6 run -e LOAD_TEST_EMAIL=youremail@test.com -e LOAD_TEST_PASSWORD=yourpassword load-test.js
```

## What it does
Ramps virtual users from 0 → 10 → 50 over ~2 minutes, hitting `/health` and `/api/auth/login`
repeatedly, then reports request duration, failure rate, and total iterations.

## Interview talking points
- Discuss what you'd do if the p95 threshold fails under load (connection pooling limits,
  caching, horizontal scaling).
- Results reflect your laptop's limits, not a production deployment — worth saying if asked.