FROM python:3.11

USER 1000:1000

WORKDIR /app

RUN pip install pipenv

COPY ./Pipfile .

RUN pipenv lock
RUN pipenv sync
RUN pipenv install gunicorn

COPY . .

EXPOSE 8000

RUN chmod +x entrypoint.sh

CMD "./entrypoint.sh"
