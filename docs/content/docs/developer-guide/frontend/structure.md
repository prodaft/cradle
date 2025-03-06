+++
title = "Project Structure"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Structure"
draft = false
weight = 1
+++

# File Structure

The repository root contains configuration files, licenses, and READMEs. After building the app, an `out` folder is generated with the bundled files.

## Root Overview

- **`src`** – Contains the application’s source code.
- **`test`** – Holds end-to-end tests between the frontend and backend.
- **`tutorials`** – Markdown files (like this guide) used in generated JSDoc.
- **`.env`** – Environment variables (see README and [Vite docs](https://vitejs.dev/guide/env-and-mode)).
- **Config Files:** For Electron-Vite projects, configurations such as `electron.vite.config.js` and `vite.config.js` are in the root.

## Inside `src`

- **`main` & `preload`:** Electron-specific files for starting the app.
- **`renderer`:** Contains the main application:
  - **`assets`:** Resources such as images and SVGs.
  - **`components`:** React components (each in its own folder with tests).
  - **`hooks`:** Custom React hooks (follow [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)).
  - **`services`:** Business logic and API calls (using Axios).
  - **`styles`:** TailwindCSS base classes and custom styles (defined in `input.css` and compiled to `output.css`).
  - **`utils`:** Shared utility functions.
