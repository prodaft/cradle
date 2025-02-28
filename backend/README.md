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

- Python 3.11+
- PostgreSQL 13+
- Redis 6.0+
- Pipenv
- MinIO (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle/backend
   git submodule update --init --recursive
   ```

2. **Database Setup**
   ```bash
   psql -U [your-postgres-username]
   CREATE DATABASE cradledb;
   ```

3. **Redis Setup**
   - Install and start Redis server
   ```bash
   # On Ubuntu
   sudo apt install redis-server
   sudo systemctl start redis
   ```

4. **Configure Environment**
   - Update database credentials in `cradle/settings.py`
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'cradledb',
           'USER': '[your_user]',
           'PASSWORD': '[your_password]',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }

   CELERY_BROKER_URL = 'redis://localhost:6379/0'
   ```

5. **Install Dependencies**
   ```bash
   pip install pipenv
   pipenv install
   ```

6. **Run Migrations**
   ```bash
   pipenv run python manage.py migrate
   ```

7. **Start Services**
   ```bash
   # Start Django development server
   pipenv run python manage.py runserver

   # Start Celery worker (in separate terminal)
   pipenv run celery -A cradle worker -Q email,notes,publish,import -l INFO
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

### Common Commands
```bash
# Run tests
pipenv run python manage.py test

# Create new migration
pipenv run python manage.py makemigrations

# Generate API documentation
cd docs && make html

# Monitor Celery tasks
pipenv run celery -A cradle flower
```

### Development Tips
```bash
# Access Django shell
pipenv run python manage.py shell_plus --ipython

# Check code quality
pipenv run flake8 .
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TROUBLESHOOTING -->
## Troubleshooting

**Database Connection Issues**
- Verify PostgreSQL service is running
- Check credentials in settings.py match your DB configuration

**Celery Task Issues**
- Ensure Redis server is running
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
