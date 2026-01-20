+++
title = "App Structure"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 2
+++

## Route layout

Routes are defined in `src/App.tsx` and rendered inside
`MainLayout`. `PrivateRoute` protects authenticated routes, while auth pages
live outside that wrapper.

Key concepts:
- `HashRouter` enables client-side routing in Electron.
- `PrivateRoute` protects routes based on authentication.
- `MainLayout` provides the app shell (sidebar, navbar, tab areas).

## Provider tree

The app wraps routes with providers for auth, API, notifications, profile,
theme, tooltips, routing config, layout, tabs, and modals. When adding new
global state, add it here to keep scope explicit.

## Adding a new route

1. Create your view under `src/components/domain`.
2. Add a `Route` entry in `App.tsx` within the `MainLayout` routes.
3. Add a navigation item in the sidebar if needed.
