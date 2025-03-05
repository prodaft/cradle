+++
date = '2025-03-05T12:55:52+01:00'
draft = false
linkTitle = 'Getting Started'
title = 'Getting Started'
+++

This guide will help you quickly set up and run a demo of CRADLE—the collaborative threat intelligence platform—in just a few minutes. Follow these simple steps to get up and running.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Git**

{{< callout emoji="🐋" >}} **Tip:** If you don’t have Docker installed, download it from [Docker's official website](https://www.docker.com/)! {{< /callout >}}


{{% steps %}}

### Clone the Repository
Open your terminal and run the following command to clone the CRADLE repository:
```sh
git clone https://github.com/prodaft/cradle.git
```

### Navigate to the Project Directory
Change into the newly cloned repository:
```sh
cd cradle
```

### Start the Demo Environment
Launch the demo using Docker Compose with the pre-configured demo file:
```sh
docker compose -f docker-compose.demo.yml up -d
```
This command downloads the necessary images, builds the containers, and starts all services in the background.

### Open CRADLE in Your Browser
Once the containers are running, open your web browser and navigate to:
```
http://localhost:8000
```
You should see the CRADLE login page.

### Log In to the Application
Use the default credentials to log in:
- **Username:** admin
- **Password:** admin

### Explore CRADLE
Now that you're logged in, take a few minutes to:
- **Browse Dashboards:** View centralized intelligence data and explore related entities.
- **Use the Graph Explorer:** Visualize and traverse relationships between entities and artifacts.
- **Create and Edit Notes:** Experience collaborative note-taking and see how CRADLE links related data automatically.


{{% /steps %}}


## Wrapping Up

You now have a fully functional demo of CRADLE running on your machine! When you’re finished exploring, you can stop the demo by executing:
```sh
docker compose -f docker-compose.demo.yml down
```

For more detailed documentation and advanced configuration, please refer to the [CRADLE Documentation](https://github.com/prodaft/cradle).
