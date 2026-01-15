<a id="readme-top"></a>

<div align="center">
  <h3 align="center">CRADLE Frontend</h3>
  <p align="center">
    Client for CRADLE
    <br />
    <a href="https://github.com/prodaft/cradle"><strong>Explore main project »</strong></a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->

## About

The CRADLE frontend is a modern application built with:

- **React** for UI components
- **Vite** for development and bundling
- **Tailwind CSS** for styling

It provides an intuitive interface for cybersecurity analysts to:

- Collaborate on threat intelligence
- Visualize entity relationships
- Generate and export reports

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

- Bun runtime
- Git

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/prodaft/cradle.git
    cd cradle/ui
    ```

2. **Install dependencies**

    ```bash
    bun install
    ```

3. **Configure environment**
   Copy the example environment file and configure it:

    ```bash
    cp .env.example .env
    ```

    Then edit `.env` and set `VITE_API_BASE_URL` to your backend API URL (default: `http://localhost:8000`).

4. **Start development server**
    ```bash
    bun run dev
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->

## Usage

### Development Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `bun run dev`       | Start development server           |
| `bun run build`     | Build production bundle            |
| `bun run lint`      | Run ESLint for code quality checks |
| `bun run typecheck` | Run tsc for typecheck              |
| `bun run verify`    | Lint and Typecheck                 |
| `bun run prettier`  | Format code with Prettier          |

### Key Features

- Hot module replacement during development
- Optimized production builds
- Automated code formatting and linting

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TROUBLESHOOTING -->

## Troubleshooting

**Build Issues**

- Ensure Bun runtime is properly installed
- Delete `node_modules` and reinstall dependencies

**Runtime Errors**

- Verify backend service is running
- Check `.env` configuration

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
