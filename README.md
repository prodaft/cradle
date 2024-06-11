# CRADLE (Front-end)

**This is the front-end client for CRADLE. The back-end server can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/backend).**

Cyber Threat Intelligence is data that is collected, processed and analyzed to understand a threat agent’s motives, targets and attack behaviours. The job of a threat analyst is multifaceted.

On the one hand, analysts need to investigate the cyber activity of threat agents and make notes which can be quickly shared among peers. The notes taken will reference different entries of interest to agents or cases. Analysts need to visualize data in a way which can aid them in making connections between agents and entries.

On the other hand, analysts need to aggregate the intelligence gathered to compile reports on the cases they investigate. Analysts need to quickly access their relevant notes to improve effectiveness and decrease the time taken for unnecessary labor.

**CRADLE** is an open-source web application that will aid the Cyber-Threat Intelligence (CTI) field by providing a collaborative, domain-specific environment. The application will allow analysts to easily conduct their investigations which can then be exported in a publishable format.

CRADLE is be a web application structured with a client-server architecture. Its design is modular to allow for other features and improvements to be added later on.
CRADLE's frontend is built using mainly [Electron](https://www.electronjs.org/) and [React](https://react.dev/), aided by technologies such as [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://vitejs.dev/). The backend is built mainly using [Django](https://www.djangoproject.com/). For more information about the backend visit its [page](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/backend).

<!--
## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method. -->

## Installation

1. Clone the project:

```
$ git clone https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend.git
```

2. Use the package manager [**npm**](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to install the dependencies:

```
$ npm install
```

## Usage

-   To start dev server (with Vite) and the electron app:

```
$ npm run dev
```

-   To start the electron app to preview production build:

```
$ npm run preview
```

-   To build for production:

```
$ npm run build
```

-   To compile css with Tailwind:

```
$ npm run tailwind
```

-   To perform linting

```
$ npm run lint
```

-   To run tests

```
$ npm run test
```

## Contributing

Right now only the designated team can contribute. Later on the project will be open sourced. The client will determine this aspect.

## Authors and acknowledgment

**This section will grow as we develop**

## License

**To be determined. The client will choose this.**
