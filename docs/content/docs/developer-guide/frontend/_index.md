+++
title = "Frontend Development Guide"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Frontend"
draft = false
+++

Welcome to the **Frontend Development Guide** for CRADLE. This guide is designed for frontend developers working on CRADLE's React application. Here, you'll find detailed insights into the code structure, architecture, and instructions for setting up and launching the frontend locally.

## Getting Started

Follow these steps to set up the CRADLE frontend on your machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle
   ```

2. **Navigate to the Frontend Directory:**
   The frontend code is located in the renderer folder:
   ```bash
   cd ui/src/renderer
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `VITE_API_BASE_URL` to your backend API URL (default: `http://localhost:8000`).
   This ensures that the frontend knows where to reach the backend API.

4. **Install Dependencies:**
   Ensure you have Bun installed. Then install dependencies:
   ```bash
   bun install
   ```

5. **Run the Development Server:**
   To start the development server:
   ```bash
   bun run dev
   ```
   Your application should now be accessible at [http://localhost:5173/](http://localhost:5173/) (or the port specified by Vite).

## Common Commands

Make sure your environment includes `VITE_API_BASE_URL=http://localhost:8080`. Here's a list of useful commands:

```bash
# Run the development server
bun run dev

# Build the project for production
bun run build

# Lint the codebase using ESLint
bun run lint

# Format code with Prettier
bun run prettier
```

## Topics Covered

This guide includes detailed sections on:

{{< cards >}}
  {{< card link="quickstart" title="Quickstart" icon="clock" >}}
  {{< card link="structure" title="App Structure" icon="view-grid" >}}
  {{< card link="troubles" title="Troubleshooting" icon="question-mark-circle" >}}
{{< /cards >}}

Happy coding and thank you for contributing to the CRADLE frontend!
