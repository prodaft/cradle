FROM python:3.11

# Set the working directory
WORKDIR /app

# Install pipenv
RUN pip install pipenv

# Copy and install Python dependencies
COPY ./Pipfile .
RUN pipenv lock
RUN pipenv sync
RUN pipenv install gunicorn

# Install Nginx/NPM
RUN apt-get update
RUN apt-get install -y nodejs npm
# RUN apt-get install -y nginx
RUN apt install -y vim

RUN rm -rf /var/lib/apt/lists/*

# Copy application source code
COPY frontend frontend

WORKDIR /app/frontend

RUN npm install

WORKDIR /app

COPY . .

# Configure Nginx
COPY ./docker/nginx.conf /etc/nginx/nginx.conf

# Copy Docker-specific settings
COPY ./cradle/settings_prod.py ./cradle/settings.py

RUN mkdir -p /var/www

# Make the entrypoint script executable
RUN chmod +x ./docker/entrypoint_prod.sh

# Expose ports
# EXPOSE 80


# Start Nginx and the Gunicorn application server
CMD ./docker/entrypoint_prod.sh
