+++
title = "Tooling and Scripts"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 11
+++

## Development scripts

Common Bun scripts:

- `bun run dev`: start the web dev server.
- `bun run build`: build the Electron bundle.
- `bun run lint`: run ESLint on `src/**/*.ts`.
- `bun run typecheck`: run TypeScript checks.
- `bun run verify`: run the verify script as defined in `package.json`.
- `bun run prettier`: format with Prettier.
- `bun run generate-api`: regenerate OpenAPI clients, for this you need to have the backend running locally or pass it a valid remote api path

## Prettier

Code formatting is managed by Prettier. The configuration file is located in
`.prettierrc`.
