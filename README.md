# CRADLE (Front-end)

Welcome to CRADLE's frontend codebase. We are happy to see you here!

**This is the front-end client for CRADLE. The back-end server can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/backend).**

---

## Introduction

Cyber Threat Intelligence (CTI) involves the collection, processing, and analysis of data to understand the motives, targets, and attack behaviors of threat agents. The role of a threat analyst is complex and multifaceted.

Analysts need to investigate cyber activities, make and share notes, visualize data to establish connections between agents and entries, and compile comprehensive reports on their findings. They require quick access to relevant notes to enhance efficiency and minimize unnecessary labor.

CRADLE is an open-source web application designed to assist CTI analysts by providing a collaborative, domain-specific note-taking tool. It streamlines the workflow of cyber threat analysts, enabling them to conduct investigations efficiently and export their findings in a publishable format.

CRADLE employs a client-server architecture with a modular design, facilitating future feature additions and improvements.
The frontend is primarily built using [Electron](https://www.electronjs.org/) and [React](https://react.dev/), supported by technologies such as [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://vitejs.dev/). The backend is built mainly using [Django](https://www.djangoproject.com/). For more information about the backend visit its [page](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/backend).

<!--
## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method. -->

---

## Getting Started

This section provides a comprehensive installation guide and instructions on how to use the application.

### Installation guide

1. Clone the project:

    ```shell
    $ git clone https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend.git
    ```

2. Use the package manager [**npm**](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to install the dependencies:

    ```shell
    $ npm install
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

## Contributing

We welcome contributions from everyone! To ensure a smooth process, please follow these guidelines:

**TBA**

---

## Code of Conduct

CRADLE is committed to fostering a welcoming and inclusive community. As contributors and users of CRADLE, we pledge to adhere to these ethical guidelines to ensure a positive and respectful environment for everyone involved.

### For Contributors

#### Respectful Collaboration

1. **Respect and Consideration**: Treat others with respect and consideration, valuing diverse perspectives and contributions.

2. **Constructive Feedback**: Provide constructive feedback that helps improve the project and fosters growth.

3. **Civility**: Be courteous and professional in interactions, even under disagreement.

#### Inclusivity and Diversity

1. **Inclusive Language**: Use inclusive language and avoid derogatory or discriminatory remarks.

2. **Diverse Perspectives**: Embrace and encourage contributions from people of all backgrounds and identities.

3. **Welcoming Environment**: Create a welcoming environment where everyone feels safe and valued.

#### Integrity and Accountability

1. **Ethical Behavior**: Conduct yourself ethically, with honesty and integrity in all interactions.

2. **Accountability**: Take responsibility for your actions and their impact on others.

3. **Conflicts of Interest**: Disclose any conflicts of interest that may arise from contributions.

#### Compliance with Legal Standards

1. **Legal Compliance**: Contributions must adhere to all applicable laws and regulations, including those concerning data privacy.

2. **Respect Intellectual Property**: Respect intellectual property rights and refrain from unauthorized use of copyrighted material.

### For Users

#### Responsible Use

1. **Lawful Use**: Use CRADLE in compliance with all applicable laws and regulations, including data privacy laws.

2. **Data Privacy**: Respect the privacy of others and handle personal data responsibly. Sharing personally identifiable information without the consent or knowledge of the individuals involved is strictly prohibited.

3. **Prohibited Content**: Refrain from posting or sharing content that is unlawful, harmful, defamatory, or discriminatory.

#### Ethical Conduct

1. **Integrity**: Use CRADLE with honesty and integrity, avoiding malicious or unethical behavior.

2. **Respect for Others**: Respect the rights and opinions of others when interacting within the application.

3. **Non-Interference**: Avoid disrupting or compromising the integrity of CRADLE or its users.

#### Community Engagement

1. **Constructive Feedback**: Provide constructive feedback to improve the application and user experience.

2. **Supportive Environment**: Foster a supportive and collaborative environment for fellow users.

3. **Reporting Concerns**: Report any concerns regarding misuse or unethical behavior to the appropriate authorities or administrators.


This version emphasizes adherence to legal standards and specifically mentions compliance with data privacy regulations, which is crucial, especially in the context of EU laws like the GDPR (General Data Protection Regulation).

By adhering to these guidelines, we contribute to a community that values inclusivity, integrity, and respect for all individuals. Thank you for your commitment to maintaining a positive environment within CRADLE.

---

## Authors and Acknowledgments

This project is maintained by a dedicated team of developers and contributors. Special thanks to everyone who has contributed to this project so far.

### Special Thanks

We would like to extend our heartfelt thanks to the developers and maintainers of the following core libraries, utilities, and tools that have played a crucial role in the development of this project:

#### Core Libraries

- **React Ecosystem**
    - `react`
    - `react-dom`
    - `react-router-dom`

- **Data Handling and Manipulation**
    - `d3`
    - `dompurify`
    - `jwt-decode`
    - `mime`
    - `pluralize`
    - `qs`

- **Markdown and Syntax Highlighting**
    - `marked`
    - `marked-highlight`
    - `prismjs`

- **Codemirror**
    - `@codemirror/lang-markdown`
    - `@codemirror/language-data`
    - `@codemirror/view`
    - `@replit/codemirror-vim`

#### Utilities and Enhancements

- **Styling and Design**
    - `@tailwindcss/forms`
    - `@tailwindcss/typography`
    - `tailwind-scrollbar`
    - `rippleui`

- **Icons and Graphics**
    - `iconoir`
    - `iconoir-react`

#### Testing and Development Tools

- **Testing Frameworks**
    - `jest`
    - `@jest/globals`
    - `jest-environment-jsdom`
    - `@testing-library/jest-dom`
    - `@testing-library/react`
    - `react-test-renderer`

- **Build and Development**
    - `electron`
    - `electron-vite`
    - `vite`
    - `@vitejs/plugin-react`
    - `babel-jest`
    - `babel-preset-vite`
    - `dotenv`
    - `globals`


If you believe your library or tool should be included here, please contact us at **TBA**.

---

## License

**CRADLE is under the free open source MIT licence.**