FROM python:3.11

WORKDIR /app

RUN pip install pipenv

COPY ./Pipfile .

RUN pipenv lock
RUN pipenv sync
RUN pipenv install gunicorn

COPY . .

COPY ./cradle/settings_docker.py ./cradle/settings.py

EXPOSE 8000

RUN chmod +x entrypoint.sh

CMD "./entrypoint.sh"
