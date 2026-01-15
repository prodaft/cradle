+++
title = "State and Data Flow"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

The app relies on context providers for auth, API access, layout, tabs, and
notifications.

## Context providers
- AuthProvider manages authentication state and guards routes.
- ApiProvider configures API access and request helpers.
- NotificationProvider manages in-app alerts.
- ProfileProvider and ThemeProvider handle user preferences.
- Tab and layout providers manage tabs and panes.

## Data flow
- API calls are made through hooks and services.
- Errors and loading states are handled at the component level.
