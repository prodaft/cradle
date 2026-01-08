# Collab Service

This is a standalone Yjs collaboration service that delegates authorization to the Django backend.
It never authenticates users directly. Instead it asks the Django API whether a user can access a
room, and only then allows the websocket connection to proceed.

## Structure

```
collab/
  src/
    index.ts     # websocket server entrypoint
    config.ts    # environment parsing
    authProxy.ts # Django authorization checks
```

## Dev

1) Copy `.env.example` to `.env` and set `COLLAB_HMAC_SECRET` (and `BASE_URL` if you want the collab server mounted under a path like `/collab`)
2) Install deps
3) Run the server

```
bun install
bun run dev
```

## Cache tuning

The collab server caches note documents after clients disconnect to reduce backend fetches.
To keep memory use low, configure the cache size and TTL:

- `COLLAB_CACHE_MAX_ENTRIES` (default `100`)
- `COLLAB_CACHE_MAX_AGE_MS` (default `0`, disabled)

## Quick start

With the backend running locally on port 8000:

```
bun run dev:setup
```

## API client generation

Generate a TypeScript client from the backend OpenAPI schema (required for collab backend calls):

```
bun run generate-api -- --input http://localhost:8000/schema/
```

Output: `collab/src/services/cradle/`

## Django auth contract

The collab server expects a Django endpoint that validates access:

```
POST ${DJANGO_BASE_URL}/internal/collab/authorize/
X-Collab-Timestamp: <unix seconds>
X-Collab-Signature: <hmac sha256>
Content-Type: application/json

{ "note_id": "<note-uuid>", "user_token": "<token from client>" }
```

Response:

```
{ "access": "READWRITE", "user_id": "<user-uuid>" }
```

The endpoint details can be adjusted in `src/authProxy.ts`.
