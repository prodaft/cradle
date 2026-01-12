+++
title = "Component Design"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 5
+++

UI components are organized by responsibility and scope.

## Component layers
- base: reusable primitives such as buttons, badges, cards, and tables.
- forms: shared form inputs and settings controls.
- layout: navigation, tabs, sidebar, and page layout.
- domain: feature-specific UI (notes, graph, files, reports, admin).
- modals: dialogs for auth, files, notes, and actions.
- feedback: error, loading, and not-found states.

## Where to add new UI
- Base UI: add to src/renderer/src/components/base.
- Feature UI: add to src/renderer/src/components/domain.
- Global layout: add to src/renderer/src/components/layout.

## Styling
- Tailwind CSS is used throughout the UI.
- Theme preferences are managed via ThemeProvider.
