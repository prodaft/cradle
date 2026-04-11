FROM python:3.12-slim

WORKDIR /app

# Copy shared base
COPY _base/ ./_base/

# Copy enricher
COPY dns/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY dns/enricher.py ./enricher.py

# Run as non-root
RUN useradd -r -s /bin/false enricher
USER enricher

ENTRYPOINT ["python", "enricher.py"]
