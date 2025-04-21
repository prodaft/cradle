<a id="readme-top"></a>

<div align="center">
  <h3 align="center">CRADLE Frontend</h3>
  <p align="center">
    Electron/Web client for CRADLE
    <br />
    <a href="https://github.com/prodaft/cradle"><strong>Explore main project »</strong></a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->

## About

The CRADLE frontend is a modern desktop application built with:

-   **React** for UI components
-   **Electron** for desktop runtime
-   **Vite** for development and bundling
-   **Tailwind CSS** for styling

It provides an intuitive interface for cybersecurity analysts to:

-   Collaborate on threat intelligence
-   Visualize entity relationships
-   Generate and export reports

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

-   Node.js 18+
-   Git

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/prodaft/cradle.git
    cd cradle/ui
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Configure environment**
   Create `.env` file with backend API URL:

    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```

4. **Start development server**
    ```bash
    npm run dev
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->

## Usage

### Development Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start development server           |
| `npm run build-web` | Build production bundle            |
| `npm run preview`   | Preview production build           |
| `npm run lint`      | Run ESLint for code quality checks |
| `npm run test`      | Execute test suite                 |
| `npm run jsdoc`     | Generate documentation             |
| `npm run prettier`  | Format code with Prettier          |

### Key Features

-   Hot module replacement during development
-   Optimized production builds
-   Automated code formatting and linting
-   Comprehensive test suite

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TROUBLESHOOTING -->

## Troubleshooting

**Build Issues**

-   Ensure Node.js version matches `.nvmrc`
-   Delete `node_modules` and reinstall dependencies

**Runtime Errors**

-   Verify backend service is running
-   Check `.env` configuration

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

See main project [contribution guidelines](../README.md#contributing). For frontend-specific contributions:

1. Fork & create feature branch
2. Commit changes with descriptive messages
3. Open pull request with test coverage

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See [LICENSE](../LICENSE) for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
