+++
title = "Architecture Overview"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

## File structure

The UI package contains configuration files, runtime assets, and source code.
After building the app, a `dist` folder is generated with bundled files.

### Root overview

- `public`: static assets and the service worker.
- `scripts`: build helpers such as OpenAPI import fixes.
- `src`: application source code.
- `.env`: environment variables (see Vite docs).
- Config files: `vite.config.ts`, `tsconfig.json`, and `eslint.config.mjs`.
- Tooling configs: `tailwind.config.ts`, `postcss.config.ts`, `eslint.config.mjs`.

### Inside src

- `assets`: images and static resources.
- `components`: React components.
- `contexts`: React context providers.
- `hooks`: custom React hooks.
- `routes`: route definitions and page-level modules.
- `services`: business logic and API clients.
- `utils`: shared utility functions.
