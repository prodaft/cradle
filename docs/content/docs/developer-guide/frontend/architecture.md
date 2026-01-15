+++
title = "Architecture Overview"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

## File structure

The UI package contains configuration files, runtime assets, and source code.
After building the app, an out folder is generated with bundled files.

### Root overview

- public: static assets and the service worker.
- scripts: build helpers such as OpenAPI import fixes.
- src: application source code.
- .env: environment variables (see Vite docs).
- Config files: electron.vite.config.ts, vite.config.ts, and jest.config.ts.
- Tooling configs: tailwind.config.ts, postcss.config.ts, eslint.config.mjs.

### Inside src

- main and preload: Electron startup files.
- renderer: main application code.
  - assets: images and SVGs.
  - components: React components (each in its own folder with tests).
  - hooks: custom React hooks.
  - services: business logic and API calls.
  - styles: TailwindCSS base classes and custom styles.
  - utils: shared utility functions.
