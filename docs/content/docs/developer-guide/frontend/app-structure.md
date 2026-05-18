+++
title = "App Structure"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 2
+++

## Route layout

Routes are file-based under `src/routes` and generated into
`src/routeTree.gen.ts` by TanStack Router. Authenticated pages are mounted
under the `/_authenticated` route, which renders `MainLayout`, while auth pages
mostly live under `/_auth` (with some public routes like `/confirm-email`,
`/reset-password`, and `/oauth/callback` outside that group).

Key concepts:
- `createFileRoute` defines routes from files in `src/routes`.
- Auth protection happens in `src/routes/_authenticated.tsx` via `beforeLoad`.
- `MainLayout` provides the app shell (sidebar, navbar, notifications panel, outlet).

## Provider tree

The root route (`src/routes/__root.tsx`) wraps the app with `AuthProvider`,
`QueryProvider`, `ApiProvider`, `ThemeProvider`, `TooltipProvider`, and `Toaster`.
Add global providers there.

## Adding a new route

1. Add a new route file under `src/routes` (for authenticated pages, place it under `src/routes/_authenticated`).
2. Export `Route` using `createFileRoute(...)` in that file.
3. Add or update sidebar/navigation entries if the route should be reachable from the UI.
