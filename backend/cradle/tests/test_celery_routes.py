from cradle.celery import app


def test_every_project_task_has_a_route():
    """Unrouted tasks go to the default queue, which the worker does not consume, so they never run."""
    app.loader.import_default_modules()
    tasks = {name for name in app.tasks if not name.startswith("celery.")}

    assert sorted(tasks - set(app.conf.task_routes)) == []
