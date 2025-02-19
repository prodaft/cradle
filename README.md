# CRADLE Monorepo

<p align="center"> <img src="backend/notes/static/notes/images/notes/logo.png" alt="Cradle Logo" width="200" height="200"> </p>

## Overview

CRADLE is an open-source web application that supports Cyber Threat Intelligence (CTI) analysts in collecting, processing, and analyzing data about threat actors. It aims to streamline the workflow of threat analysts by providing a collaborative note-taking environment, quick data access, and visual tools to draw connections between threat entities and artifacts.

**Key Features**
- **Collaborative Note-Taking**: Share and store investigation notes in one place.
- **Visualization and Analysis**: Easily connect related entities (agents, artifacts, and more).
- **Publishable Reports**: Export and share comprehensive intelligence findings.
- **Modular Architecture**: Built for flexibility and future feature expansion.

---

## Repository Structure

This monorepo is organized into three main directories:

- **backend/**
  Contains the Django-based backend for CRADLE.
  See its dedicated [README](backend/README.md) for information about local installation, commands, and usage.

- **ui/**
  Contains the Electron/React-based front-end application.
  See its dedicated [README](ui/README.md) for details on local installation and development.

- **deploy/**
  Holds Ansible playbooks and other deployment-related scripts/configurations.

---

## Getting Started

For most users, **Docker** is the recommended way to spin up the CRADLE environment. Advanced users and developers who need more control can refer to the specific READMEs for [backend](backend/README.md) and frontend to set up those components locally.

### Run with Docker (Recommended)

Running CRADLE with Docker Compose will automatically set up all required services (backend, frontend, database, etc.).

1. **Clone the monorepo:**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle
   ```

2. **Start services using Docker Compose**:
   ```bash
   docker compose -f docker-compose.demo.yml up -d
   ```
   This launches all necessary components, enabling you to access CRADLE on your local machine without manual dependency management.

---

## Contributing

We welcome contributions of all kinds—bug reports, feature requests, and documentation improvements. Please follow these guidelines:

- **Issues & Bug Reports**
  If you encounter a bug or have questions, please [open an issue](https://github.com/prodaft/cradle/issues).

- **Pull Requests**
  Pull requests are welcome! If you intend to introduce significant changes, create an issue or discuss them first to ensure a smooth process.

---

## Authors & Acknowledgments

CRADLE is developed by PRODAFT in collaboration with students from TU Delft. Special thanks to everyone who contributes to making this project possible.

**Contributors**
- [Tudor Măgirescu](https://github.com/TudorMagirescu)
- [Călin-Marian Diacicov](https://github.com/klinashka)
- [Daniel Popovici](https://github.com/Babu-on-Github)
- [Matei Grigore](https://github.com/mateigrigore)
- [Razvan Dinu](https://github.com/razvand13)
- [Yigit Colakoglu](https://github.com/arg3t)

---

## License

This project is licensed under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this software for both commercial and non-commercial purposes. See the `LICENSE` file for full license details.
