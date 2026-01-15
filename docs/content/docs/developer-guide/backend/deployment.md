+++
title = "Deployment Basics"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 13
+++

## Startup order
- Database and Redis services
- Apply migrations
- Start the API server
- Start background workers

## Docker demo
The demo stack can be started with:

```shell
docker compose -f docker-compose.demo.yml up -d
```

## Operational checks
- Confirm schema migrations completed.
- Verify worker queues are active.
- Run a basic login and note creation test.
