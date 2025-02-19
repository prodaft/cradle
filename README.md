# CRADLE (Front-end)
Welcome to CRADLE's frontend codebase. We are happy to see you here!

**This is the front-end client for CRADLE. The back-end server can be found [here](https://github.com/prodaft/cradle-backend).**

---

## Getting Started

This section provides a comprehensive installation guide and instructions on how to use the application.

### Installation guide

1. Clone the project:

    ```shell
    git clone https://github.com/prodaft/cradle-ui.git
    ```

2. Use the package manager [**npm**](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to install the dependencies:

    ```shell
    npm install
    ```

### Scripts and Usage

The following scripts are available to manage and develop the CRADLE frontend:

-   **Start Development Mode:**

    Launches the application in development mode using Vite's dev server and Electron. This is useful for active development and debugging.

    ```shell
    npm run dev
    ```

-   **Start Preview Mode:**

    Launches the Electron application in production mode for preview purposes. This is useful for testing the production build locally.

    ```shell
    npm run preview
    ```

-   **Build for Production:**

    Compiles the application for production, including CSS with Tailwind and the main build process using Electron-Vite.

    ```shell
    npm run build
    ```

-   **Compile CSS with Tailwind:**

    Processes the CSS files using Tailwind CSS, converting the input styles into the final output styles.

    ```shell
    npm run tailwind
    ```

-   **Watch Mode for Tailwind**

    Watches for changes in the CSS files and automatically recompiles the styles using Tailwind CSS.

    ```shell
    npm run tailwind-w
    ```

-   **Perform Linting:**

    Runs ESLint on the codebase to enforce code quality and consistency.

    ```shell
    npm run lint
    ```

-   **Run Tests:**

    Executes the test suite using Jest to ensure the application works as expected.

    ```shell
    npm run test
    ```

-   **Generate Documentation:**

    Generates documentation from the codebase using JSDoc.

    ```shell
    npm run jsdoc
    ```

-   **Format Code with Prettier:**

    Formats the codebase using Prettier to maintain a consistent code style.

    ```shell
    npm run prettier
    ```

---

# Environment Variables

The following environment variables are expected by the codebase:

-   `VITE_API_BASE_URL`: the base URL of the backend server (e.g. `http://localhost:8000`)

---


## Authors and Acknowledgments

CRADLE is developed in PRODAFT, in collaboration with TU Delft students. We thank everyone who contributes to the development process of CRADLE.

### Contributors

- [Tudor Măgirescu](https://github.com/TudorMagirescu)
- [Călin-Marian Diacicov](https://github.com/klinashka)
- [Daniel Popovici](https://github.com/Babu-on-Github)
- [Matei Grigore](https://github.com/mateigrigore)
- [Razvan Dinu](https://github.com/razvand13)
- [Yigit Colakoglu](https://github.com/arg3t)

We would like to extend our heartfelt thanks to the developers and maintainers of the following core libraries, utilities, and tools that have played a crucial role in the development of this project:

### Core Libraries

-   **React Ecosystem**

    -   `react`
    -   `react-dom`
    -   `react-router-dom`

-   **Data Handling and Manipulation**

    -   `d3`
    -   `dompurify`
    -   `jwt-decode`
    -   `mime`
    -   `pluralize`
    -   `qs`

-   **Markdown and Syntax Highlighting**

    -   `marked`
    -   `marked-highlight`
    -   `prismjs`

-   **Codemirror**
    -   `@codemirror/lang-markdown`
    -   `@codemirror/language-data`
    -   `@codemirror/view`
    -   `@replit/codemirror-vim`

### Utilities and Enhancements

-   **Styling and Design**

    -   `@tailwindcss/forms`
    -   `@tailwindcss/typography`
    -   `tailwind-scrollbar`
    -   `rippleui`

-   **Icons and Graphics**
    -   `iconoir`
    -   `iconoir-react`

### Testing and Development Tools

-   **Testing Frameworks**

    -   `jest`
    -   `@jest/globals`
    -   `jest-environment-jsdom`
    -   `@testing-library/jest-dom`
    -   `@testing-library/react`
    -   `react-test-renderer`

-   **Build and Development**
    -   `electron`
    -   `electron-vite`
    -   `vite`
    -   `@vitejs/plugin-react`
    -   `babel-jest`
    -   `babel-preset-vite`
    -   `dotenv`
    -   `globals`

If you believe your library or tool should be included here, please create an issue.

---

## License

**CRADLE is under the free open source MIT licence.** The license can be found in the [LICENSE](LICENSE) file.
