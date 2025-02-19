# CRADLE Backend

The CRADLE backend is a [Django](https://www.djangoproject.com/) application that provides the core server-side functionality, including data models, API endpoints, and integrations with external services such as PostgreSQL and MinIO.

> **Note**  
> If you prefer to run the entire CRADLE application (backend + frontend + services) without manual setup, see the [main README](../README.md) for the Docker-based quick start instructions.

---

## Requirements

- **Python 3.11** (or later)
- **PostgreSQL** (tested with version 13+)
- **Pipenv** (for managing Python dependencies)
- **MinIO** (optional; used for file/object storage)

---

## Installation (Local)

### 1. Clone the Repository

```bash
git clone https://github.com/prodaft/cradle.git
cd cradle/backend
```

Make sure you have initialized and updated submodules if needed:
```bash
git submodule update --init --recursive
```

### 2. Set Up Your Database

Install and run [PostgreSQL](https://www.postgresql.org/). Create a database and user:

```bash
psql -U [your-postgres-username]
CREATE DATABASE cradledb;
```

### 3. Configure Django Settings

- Open `backend/cradle/settings.py` (or your environment-specific settings file).
- Update `DATABASES` with your database name, user, and password.
- If using MinIO, update the corresponding storage settings (endpoint, credentials, etc.).

### 4. Install Dependencies

Ensure [Pipenv](https://pipenv.pypa.io/en/latest/) is installed, then run:

```bash
pip install pipenv
pipenv install
```

### 5. Apply Database Migrations

```bash
pipenv run python manage.py migrate
```

### 6. Run the Backend Server

```bash
pipenv run python manage.py runserver
```

This command starts the Django development server. By default, it listens on `http://127.0.0.1:8000/`.

---

## Usage & Commands

Below are common commands you may need during development:

- **Migrate the Database Schema**  
  ```bash
  pipenv run python manage.py migrate
  ```

- **Run the Development Server**  
  ```bash
  pipenv run python manage.py runserver
  ```

- **Run Tests**  
  ```bash
  pipenv run python manage.py test
  ```

- **Generate & Build Sphinx Documentation**  
  ```bash
  # Generate .rst files from source
  sphinx-apidoc -f -T -o docs/api_reference . '*/tests/*' '*/migrations/*'

  # Build HTML docs
  sphinx-build -b html -b coverage docs docs/_build

  # Alternatively, in docs folder:
  cd docs
  make html
  ```

---

## Troubleshooting

- **Database Connection Errors**  
  Make sure your PostgreSQL instance is running and that the credentials in `settings.py` match your system.
- **MinIO Configuration**  
  If using MinIO, confirm the endpoint and access keys in your settings match those of your running MinIO instance.

---

## Contributing

If you find issues specific to the backend or would like to propose improvements, please:

1. **Open an Issue**: Provide details about the bug/feature request.  
2. **Submit a Pull Request**: Fork the repository, implement your changes, and open a PR.

For broader project-level discussions, refer to the [main README](../README.md).

---

## License

This project is licensed under the **[MIT License](../LICENSE)**. You are free to use, modify, and distribute this software for both commercial and non-commercial purposes. See the `LICENSE` file for full license details.
