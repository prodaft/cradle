# CRADLE (Back End)

Welcome to CRADLE's back end codebase. We are happy to see you here!

**This is the back end server of CRADLE. The front end client can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).**

---

## Introduction

Cyber Threat Intelligence (CTI) involves the collection, processing, and analysis of data to understand the motives, targets, and attack behaviors of threat agents. The role of a threat analyst is complex and multifaceted.

Analysts need to investigate cyber activities, make and share notes, visualize data to establish connections between agents and artifacts, and compile comprehensive reports on their findings. They require quick access to relevant notes to enhance efficiency and minimize unnecessary labor.

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

* Generating and Building the Static HTML Sphinx Documentation:
```
sphinx-apidoc -f -T -o docs/api_reference . '*/tests/*' '*/migrations/*'
sphinx-build -b html -b coverage docs docs/_build
cd docs
make html
```

---

## Contributing

We welcome contributions from everyone! To ensure a smooth process, please follow these guidelines:

**TBA**

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

**TBA**

---

## License
**CRADLE is under the free open source MIT licence.** The license can be found in the [LICENSE](LICENSE) file.
