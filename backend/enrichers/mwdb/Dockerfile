FROM python:3.14-slim

WORKDIR /app

COPY _base/ ./_base/

COPY mwdb/pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir .

COPY mwdb/enricher.py ./enricher.py

RUN useradd -r -s /bin/false enricher
USER enricher

ENTRYPOINT ["python", "enricher.py"]
