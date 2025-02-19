# CRADLE Frontend

Welcome to the CRADLE frontend codebase! This is the Electron/React client application for CRADLE.
If you would like to run the entire CRADLE system (including the backend and all services) via Docker, refer to the [main README](../README.md) for quick start instructions.

---

## Overview

The CRADLE frontend is built with [React](https://react.dev/) and [Electron](https://www.electronjs.org/), using [Vite](https://vitejs.dev/) for development and bundling. Styling is managed through [Tailwind CSS](https://tailwindcss.com/). The resulting application provides a rich user interface for interacting with CRADLE’s backend services, enabling cybersecurity analysts to collaborate, visualize intelligence data, and publish reports.

---

## Prerequisites

- [Node.js](https://nodejs.org/en/) (which includes `npm`)
- [Git](https://git-scm.com/) (to clone the repository)

---

## Installation

1. **Clone the Monorepo**

   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle/frontend
   ```

   > Make sure to initialize and update any submodules if needed:
   > ```bash
   > git submodule update --init --recursive
   > ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

---

## Scripts & Usage

The following scripts are defined in the `package.json` to help with development, building, and testing.

- **Start Development Mode**
  Launches the application in development mode (Electron + Vite dev server):
  ```bash
  npm run dev
  ```

- **Start Preview Mode**
  Builds the application in production mode and launches it for preview within Electron:
  ```bash
  npm run preview
  ```

- **Build for Production**
  Compiles the frontend code and packages it using Vite for production:
  ```bash
  npm run build-web
  ```

- **Compile CSS with Tailwind**
  Processes the CSS files to produce the final styling output:
  ```bash
  npm run tailwind
  ```

- **Watch Mode for Tailwind**
  Watches for changes in CSS files and recompiles automatically:
  ```bash
  npm run tailwind-w
  ```

- **Perform Linting**
  Runs [ESLint](https://eslint.org/) on the codebase for code quality checks:
  ```bash
  npm run lint
  ```

- **Run Tests**
  Executes the test suite using [Jest](https://jestjs.io/):
  ```bash
  npm run test
  ```

- **Generate Documentation**
  Builds documentation using [JSDoc](https://jsdoc.app/):
  ```bash
  npm run jsdoc
  ```

- **Format Code with Prettier**
  Formats code automatically for a consistent style:
  ```bash
  npm run prettier
  ```

---

## Environment Variables

The frontend expects certain environment variables, typically provided via `.env` or `.env.local` files:

- **`VITE_API_BASE_URL`**
  Base URL for the backend server.
  Example: `VITE_API_BASE_URL=http://localhost:8000`

---

## Contributing

We welcome all contributions, including bug reports, feature requests, and documentation improvements. Please follow these steps:

1. **Open an Issue**
   If you find a bug or want to propose a feature, [open an issue](https://github.com/prodaft/cradle/issues) describing the problem or idea.

2. **Submit a Pull Request**
   - Fork the repository and create a new branch for your changes.
   - Commit your modifications and push your branch.
   - Open a Pull Request against the main repository.

For overall project-level coordination, please refer to the [main README](../README.md).

---

## Authors & Acknowledgments

CRADLE is developed by PRODAFT in collaboration with TU Delft students. We sincerely thank everyone who contributes to the development of CRADLE.

**Contributors**
- [Tudor Măgirescu](https://github.com/TudorMagirescu)
- [Călin-Marian Diacicov](https://github.com/klinashka)
- [Daniel Popovici](https://github.com/Babu-on-Github)
- [Matei Grigore](https://github.com/mateigrigore)
- [Razvan Dinu](https://github.com/razvand13)
- [Yigit Colakoglu](https://github.com/arg3t)

### Core Libraries & Tools

- **React**
- **Electron**
- **Vite**
- **Tailwind CSS**
- **ESLint**, **Prettier**
- **Jest**
- **Codemirror**
- **Marked**, **PrismJS**

(See `package.json` for full details.)

---

## License

CRADLE is provided under the **[MIT License](../LICENSE)**. You are free to use, modify, and distribute this software for both commercial and non-commercial purposes.
