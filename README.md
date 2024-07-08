# CRADLE (Front-end)

Welcome to CRADLE's frontend codebase. We are happy to see you here!

**This is the front-end client for CRADLE. The back-end server can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/backend).**

---

The User Guide can be found at: {@tutorial User Guide}

The Developer Guide can be found at: {@tutorial Developer Guide}

---

## Introduction

Cyber Threat Intelligence (CTI) involves the collection, processing, and analysis of data to understand the motives, targets, and attack behaviors of threat agents. The role of a threat analyst is complex and multifaceted.

Analysts need to investigate cyber activities, make and share notes, visualize data to establish connections between agents and artifacts, and compile comprehensive reports on their findings. They require quick access to relevant notes to enhance efficiency and minimize unnecessary labor.

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
    git clone https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend.git
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


## Code of Conduct

Like the technical community as a whole, the CRADLE team and community is made up of a mixture of professionals and volunteers from all over the world.

Diversity is one of our huge strengths, but it can also lead to communication issues and unhappiness. To that end, we have a few ground rules that we ask people to adhere to. This code applies equally to founders, contributors and users of CRADLE.

This isn’t an exhaustive list of things that you can’t do. Rather, take it in the spirit in which it’s intended - a guide to make it easier to enrich all of us and the technical communities in which we participate.

This code of conduct applies to all spaces managed by CRADLE's team. In addition, violations of this code outside these spaces may affect a person's ability to participate within them.

If you believe someone is violating the code of conduct, we ask that you report it by emailing **TBA**.

- Be friendly and patient.
- Be welcoming. We strive to be a community that welcomes and supports people of all backgrounds and identries. This includes, but is not limited to members of any race, ethnicity, culture, national origin, colour, immigration status, social and economic class, educational level, sex, sexual orientation, gender identry and expression, age, size, family status, political belief, religion, and mental and physical ability.
- Be considerate. Your work will be used by other people, and you in turn will depend on the work of others. Any decision you take will affect users and colleagues, and you should take those consequences into account when making decisions. Remember that we're a world-wide community, so you might not be communicating in someone else's primary language.
- Be respectful. Not all of us will agree all the time, but disagreement is no excuse for poor behavior and poor manners. We might all experience some frustration now and then, but we cannot allow that frustration to turn into a personal attack. It’s important to remember that a community where people feel uncomfortable or threatened is not a productive one. Members of the CRADLE community should be respectful when dealing with other members as well as with people outside the CRADLE community.
- Be careful in the words that you choose. We are a community of professionals, and we conduct ourselves professionally. Be kind to others. Do not insult or put down other participants. Harassment and other exclusionary behavior aren't acceptable. This includes, but is not limited to:
  - Violent threats or language directed against another person.
  - Discriminatory jokes and language.
  - Posting sexually explicit or violent material.
  - Posting (or threatening to post) other people's personally identifying information ("doxing").
  - Sharing personally identifiable information about another person without their consent in any form, including in documents, images, videos, code or other materials shared in CRADLE.
  - Personal insults, especially those using racist or sexist terms.
  - Unwelcome sexual attention.
  - Advocating for, or encouraging, any of the above behavior.
  - Repeated harassment of others. In general, if someone asks you to stop, then stop.
- When we disagree, try to understand why. Disagreements, both social and technical, happen all the time and CRADLE is no exception. It is important that we resolve disagreements and differing views constructively. Remember that we’re different. The strength of CRADLE comes from its varied community, people from a wide range of backgrounds. Different people have different perspectives on issues. Being unable to understand why someone holds a viewpoint doesn’t mean that they’re wrong. Don’t forget that it is human to err and blaming each other doesn’t get us anywhere. Instead, focus on helping to resolve issues and learning from mistakes.

Original text courtesy of the [Django Project](https://www.djangoproject.com/conduct/).

---

## Authors and Acknowledgments

This project is maintained by a dedicated team of developers and contributors. Special thanks to everyone who has contributed to this project so far.

### Special Thanks

We would like to extend our heartfelt thanks to the developers and maintainers of the following core libraries, utilities, and tools that have played a crucial role in the development of this project:

#### Core Libraries

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

#### Utilities and Enhancements

-   **Styling and Design**

    -   `@tailwindcss/forms`
    -   `@tailwindcss/typography`
    -   `tailwind-scrollbar`
    -   `rippleui`

-   **Icons and Graphics**
    -   `iconoir`
    -   `iconoir-react`

#### Testing and Development Tools

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

If you believe your library or tool should be included here, please contact us at **TBA**.

---

## License

**CRADLE is under the free open source MIT licence.** The license can be found in the [LICENSE](LICENSE) file.
