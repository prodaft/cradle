# CRADLE (Back-end)

**This is the back-end server for CRADLE. The front-end client can be found [here](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).**

Cyber Threat Intelligence is data that is collected, processed and analyzed to understand a threat agent’s motives, targets and attack behaviours. The job of a threat analyst is multifaceted.

On the one hand, analysts need to investigate the cyber activity of threat agents and make notes which can be quickly shared among peers. The notes taken will reference different entries of interest to agents or cases. Analysts need to visualize data in a way which can aid them in making connections between agents and entries.

On the other hand, analysts need to aggregate the intelligence gathered to compile reports on the cases they investigate. Analysts need to quickly access their relevant notes to improve effectiveness and decrease the time taken for unnecessary labor.

**CRADLE** is an open-source web application that will aid the Cyber-Threat Intelligence (CTI) field by providing a collaborative, domain-specific environment. The application will allow analysts to easily conduct their investigations which can then be exported in a publishable format.

CRADLE is be a web application structured with a client-server architecture. Its design is modular to allow for other features and improvements to be added later on.
CRADLE's frontend is built using mainly [Electron](https://www.electronjs.org/) and [React](https://react.dev/), aided by technologies such as [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://vitejs.dev/). The backend is built mainly using the [Django](https://www.djangoproject.com/) web framework and [PostgreSQL](https://www.postgresql.org/) for data storage. For more information about the frontend visit its [page](https://gitlab.ewi.tudelft.nl/cse2000-software-project/2023-2024/cluster-j/08b/frontend).

<!-- 
## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method. --> 

## Installation
1. Clone the project:
```
$ git clone git@gitlab.ewi.tudelft.nl:cse2000-software-project/2023-2024/cluster-j/08b/backend.git
```
2. Install [PostgreSQL](https://www.postgresql.org/). You will need to ensure you have created a user with its associated password (the default is ```postgres```).
3. Run the server (usually this might happen automatically after install). Use a client such as ```psql``` to communicate with it:
```
$ psql -U [your-username]
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
6. Install [Pipenv](https://pipenv.pypa.io/en/latest/) (Note: Your [Python](https://www.python.org/downloads/release/python-3110/) version should be 3.11):
```
$ pip install pipenv
```
7. Navigate to the projects root project. Migrate the database schema:
```
$ pipenv run python manage.py makemigrations
$ pipenv run python manage.py migrate
```

## Usage
- To run the server, use:
```
$ pipenv run python manage.py runserver
```
- To run tests, use:
```
$ pipenv run python manage.py test
```

## Contributing
Right now only the designated team can contribute. Later on the project will be open sourced. The client will determine this aspect.

## Authors and acknowledgment
**This section will grow as we develop**

## License
**To be determined. The client will choose this.**
