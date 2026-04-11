FROM python:3.12-slim

WORKDIR /app

COPY _base/ ./_base/

COPY mwdb/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY mwdb/enricher.py ./enricher.py

RUN useradd -r -s /bin/false enricher
USER enricher

ENTRYPOINT ["python", "enricher.py"]
