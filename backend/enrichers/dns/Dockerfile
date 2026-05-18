FROM python:3.14-slim

WORKDIR /app

# Copy shared base
COPY _base/ ./_base/

# Copy enricher
COPY dns/pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir .

COPY dns/enricher.py ./enricher.py

# Run as non-root
RUN useradd -r -s /bin/false enricher
USER enricher

ENTRYPOINT ["python", "enricher.py"]
