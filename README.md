# CRADLE (Back End)

Welcome to CRADLE's back end codebase. We are happy to see you here!

**This is the back end server of CRADLE. The front end client can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).**

---

## Introduction

Cyber Threat Intelligence (CTI) involves the collection, processing, and analysis of data to understand the motives, targets, and attack behaviors of threat agents. The role of a threat analyst is complex and multifaceted.

Analysts need to investigate cyber activities, make and share notes, visualize data to establish connections between agents and entries, and compile comprehensive reports on their findings. They require quick access to relevant notes to enhance efficiency and minimize unnecessary labor.

CRADLE is an open-source web application designed to assist CTI analysts by providing a collaborative, domain-specific note-taking tool. It streamlines the workflow of cyber threat analysts, enabling them to conduct investigations efficiently and export their findings in a publishable format.

CRADLE employs a client-server architecture with a modular design, facilitating future feature additions and improvements.
The front end is primarily built using [Electron](https://www.electronjs.org/) and [React](https://react.dev/), supported by technologies such as [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://vitejs.dev/). The back end is built mainly using [Django](https://www.djangoproject.com/). For more information about the front end visit its [page](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).

---

## Getting Started

This section provides a comprehensive installation guide and instructions on how to use the application.

### Installation

1. Clone the project:
```
git clone git@gitlab.ewi.tudelft.nl:cse2000-software-project/2023-2024/cluster-j/08b/backend.git
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
5. Our Django database configuration requires you to create **environment variables** which should be mapped to details regarding the PostgreSQL connection.
```
export POSTGRES_DB=[name of database]
export POSTGRES_USER=[username]
export POSTGRES_PASSWORD=[the password associated with the username]
export POSTGRES_HOST=[the location where the PostgreSQL server is running]
```
6. Install [Minio](https://min.io/) and run an instance of it. This will be used for file storage. Define the **environment variables** which are described in `file_transfer/config.py`. 
7. Install [Pipenv](https://pipenv.pypa.io/en/latest/) (Note: Your [Python](https://www.python.org/downloads/release/python-3110/) version should be 3.11):
```
pip install pipenv
```

### Scripts and Usage

* Migrating the Database Schema:
```
pipenv run python manage.py makemigrations
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

---

## Contributing

We welcome contributions from everyone! To ensure a smooth process, please follow these guidelines:

**TBA**

---

## Code of Conduct

**TBA**

---

## Authors and Acknowledgments

This project is maintained by a dedicated team of developers and contributors. Special thanks to everyone who has contributed to this project so far.

### Special Thanks

**TBA**

---

## License
**CRADLE is under the free open source MIT licence.** The license can be found in the [LICENSE](LICENSE) file.
