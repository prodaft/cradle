# CRADLE Monorepo
<p align="center">
    <img width="200" height="200" src="backend/notes/static/notes/images/notes/logo.png" alt="Cradle Logo">
</p>

---

## Introduction

Cyber Threat Intelligence (CTI) involves the collection, processing, and
analysis of data to understand the motives, targets, and attack behaviors of
threat agents. The role of a threat analyst is complex and multifaceted.

Analysts need to investigate cyber activities, make and share notes, visualize
data to establish connections between agents and artifacts, and compile
comprehensive reports on their findings. They require quick access to relevant
notes to enhance efficiency and minimize unnecessary labor.

CRADLE is an open-source web application designed to assist CTI analysts by
providing a collaborative, domain-specific note-taking tool. It streamlines the
workflow of cyber threat analysts, enabling them to conduct investigations
efficiently and export their findings in a publishable format.

---

## Getting Started

This section provides a comprehensive installation guide and instructions on how to use the application.

### Installation
#### Docker (Recommended)

If you want to run CRADLE in docker, you can use our docker-compose file which
starts up all the necessary services for you. 

CRADLE employs a client-server architecture with a modular design, facilitating future feature additions and improvements.
The front end is primarily built using [Electron](https://www.electronjs.org/) and [React](https://react.dev/), supported by technologies such as [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://vitejs.dev/). The back end is built mainly using [Django](https://www.djangoproject.com/). For more information about the front end visit its [page](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).

---

## Getting Started

This section provides a comprehensive installation guide and instructions on how to use the application.

### Installation

1. Clone the project:
```
git clone git@github.com:prodaft/cradle-backend.git cradle
cd cradle
git submodule update --init --recursive
sudo docker compose -f docker-compose-demo.yml up -d
```

#### Native

1. Clone the project:

```
git clone git@github.com:prodaft/cradle-backend.git
```

2. Install [PostgreSQL](https://www.postgresql.org/). You will need to ensure you have created a user with its associated password (the default is ```postgres```).
3. Run the server (usually this might happen automatically after install). Use a client such as ```psql``` to communicate with it:

```
psql -U [your-username]
```

4. Once in the interactive section, create a new database:

```
postgres=# CREATE DATABASE cradledb;
```

5. Adjust the cradle/settings.py file to reflect your database configuration.
6. Install [Minio](https://min.io/) and run an instance of it. This will be used for file storage. Adjust the settings file once again.
7. Install [Pipenv](https://pipenv.pypa.io/en/latest/) (Note: Your [Python](https://www.python.org/downloads/release/python-3110/) version should be 3.11):

```
pip install pipenv
```


### Scripts and Usage

* Migrating the Database Schema:
```
pipenv run python manage.py migrate
```

* Running the Server:
```
pipenv run python manage.py runserver
```

* Running the Tests:
```
pipenv run python manage.py test
```

* Generating and Building the Static HTML Sphinx Documentation:
```
sphinx-apidoc -f -T -o docs/api_reference . '*/tests/*' '*/migrations/*'
sphinx-build -b html -b coverage docs docs/_build
cd docs
make html
```

---

## Contributing & Reporting

We welcome contributions from everyone! To ensure a smooth process, please follow these guidelines:

- **If you are experiencing an issue regarding setup or usage:** Please do not
  hesitate to [create an issue](https://github.com/prodaft/cradle-backend/issues/new).
  Please be descriptive when reporting issues, and include the steps necessary to reproduce.
- **Pull Requests are Welcome!** If you would like to contribute a feature or fix a bug: Great!. Go ahead and create a merge request.

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

---

## License
**CRADLE is under the free open source MIT licence.** The license can be found in the [LICENSE](LICENSE) file.
