<a id="readme-top"></a>

<div align="center">
  <h3 align="center">CRADLE Backend</h3>
  <p align="center">
    Django-powered API for CRADLE
    <br />
    <a href="https://github.com/prodaft/cradle"><strong>Explore main project »</strong></a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About

Django-based backend providing core functionality for CRADLE including:
- REST API endpoints
- Data models and PostgreSQL integration
- File storage with MinIO
- Authentication system
- Background task processing with Celery and Redis

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

- Python 3.14+
- uv
- Docker with Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle
   ```

2. **Start supporting services**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
   This starts PostgreSQL, Redis, RabbitMQ and MinIO (plus Keycloak and pgAdmin).

3. **Configure Environment**
   ```bash
   cd backend
   cp .env.example .env
   ```
   The defaults in `.env.example` match the credentials used by `docker-compose.dev.yml`.

4. **Install Dependencies**
   ```bash
   uv sync
   ```

5. **Run Migrations**
   ```bash
   uv run python manage.py migrate
   ```

6. **Start Services**
   ```bash
   # Start Django development server
   uv run python manage.py runserver

   # Start Celery worker with beat and all routed queues (in separate terminal)
   uv run celery -A cradle worker --beat -Q email,notes,graph,publish,import,access,enrich,digest,files,cleanup -l INFO
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

### Common Commands
```bash
# Run tests
uv run python manage.py test

# Create new migration
uv run python manage.py makemigrations

# Generate API documentation
cd docs && make html

# Monitor Celery tasks
uv run celery -A cradle flower
```

### Development Tips
```bash
# Access Django shell
uv run python manage.py shell_plus --ipython

# Format code
uv run ruff format .

# Check code quality
uv run ruff check .
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TROUBLESHOOTING -->
## Troubleshooting

**Database Connection Issues**
- Verify the containers are running: `docker compose -f docker-compose.dev.yml ps`
- Check the `DB_*` values in `backend/.env` match `docker-compose.dev.yml`

**Celery Task Issues**
- Ensure the RabbitMQ and Redis containers are running
- Verify Celery worker is started
- Check task queue status with Flower

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

See main project [contribution guidelines](../README.md#contributing). For backend-specific issues:

1. Fork & create feature branch
2. Commit changes with descriptive messages
3. Open pull request with test coverage details

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE](../LICENSE) for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
