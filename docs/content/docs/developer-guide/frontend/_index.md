+++
title = "Frontend Development Guide"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Frontend"
draft = false
+++

Welcome to the **Frontend Development Guide** for CRADLE. This guide is designed for frontend developers working on CRADLE’s React/Electron application. Here, you'll find detailed insights into the code structure, architecture, and instructions for setting up and launching the frontend locally.

## Getting Started

Follow these steps to set up the CRADLE frontend on your machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle
   ```

2. **Navigate to the Frontend Directory:**
   The frontend code is located in the Electron renderer folder:
   ```bash
   cd src/renderer
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `src/renderer` directory with the following content:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```
   This ensures that the frontend knows where to reach the backend API.

4. **Install Dependencies:**
   Ensure you have Node.js (v16+) installed. Then install dependencies using npm (or yarn):
   ```bash
   npm install
   ```
   *Or if you prefer yarn:*
   ```bash
   yarn install
   ```

5. **Run the Development Server:**
   To start the development server for the web version:
   ```bash
   npm run dev
   ```
   To launch the Electron application in development mode:
   ```bash
   npm run electron:dev
   ```
   Your application should now be accessible. For the web version, visit [http://localhost:3000/](http://localhost:3000/) (or the port specified by Vite).

## Common Commands

Make sure your environment includes `VITE_API_BASE_URL=http://localhost:8080`. Here’s a list of useful commands:

```bash
# Run the development server (web version)
npm run dev

# Launch the Electron app in development mode
npm run electron:dev

# Run tests
npm run test

# Build the project to be served on a browser
npm run build-web

# Lint the codebase using ESLint
npm run lint

# Format code with Prettier
npm run prettier
```

## Topics Covered

This guide includes detailed sections on:

{{< cards >}}
  {{< card link="quickstart" title="Quickstart" icon="clock" >}}
  {{< card link="structure" title="App Structure" icon="view-grid" >}}
  {{< card link="troubles" title="Troubleshooting" icon="question-mark-circle" >}}
{{< /cards >}}

Happy coding and thank you for contributing to the CRADLE frontend!
