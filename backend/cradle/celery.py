from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from django.conf import settings
from django.apps import apps
from celery.schedules import crontab

import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cradle.settings")

app = Celery("cradle")

app.config_from_object(settings)
app.conf.broker_url = settings.RESULT_BACKEND

app.autodiscover_tasks(lambda: [n.name for n in apps.get_app_configs()])

app.conf.timezone = "UTC"
app.conf.broker_connection_retry_on_startup = True
app.conf.result_expires = 259200  # 3 days in seconds

app.conf.task_routes = {
    "mail.tasks.send_email_task": {"queue": "email"},
    "notes.tasks.smart_linker_task": {"queue": "notes"},
    "notes.tasks.entry_class_creation_task": {"queue": "notes"},
    "notes.tasks.entry_population_task": {"queue": "notes"},
    "entries.tasks.remap_notes_task": {"queue": "notes"},
    "entries.tasks.simulate_graph": {"queue": "graph"},
    "entries.tasks.refresh_edges_materialized_view": {"queue": "graph"},
    "entries.tasks.delete_hanging_artifacts": {"queue": "graph"},
    "notes.tasks.connect_aliases": {"queue": "notes"},
    "notes.tasks.ping_entries": {"queue": "notes"},
    "publish.tasks.generate_report": {"queue": "publish"},
    "publish.tasks.edit_report": {"queue": "publish"},
    "publish.tasks.import_json_report": {"queue": "import"},
    "publish.tasks.download_file_for_note": {"queue": "import"},
    "notes.tasks.propagate_acvec": {"queue": "access"},
    "intelio.tasks.core.propagate_acvec": {"queue": "access"},
    "entries.tasks.update_accesses": {"queue": "access"},
    "entries.tasks.scan_for_children": {"queue": "enrich"},
    "intelio.tasks.core.enrich_periodic": {"queue": "enrich"},
    "intelio.tasks.core.enrich_entries": {"queue": "enrich"},
    "intelio.tasks.core.start_digest": {"queue": "digest"},
    "intelio.tasks.falcon.digest_chunk": {"queue": "digest"},
}

app.conf.task_default_priority = 5
app.conf.task_send_sent_event = True

app.conf.task_routes.update(
    {
        "send_email_task": {
            "queue": "email",
            "rate_limit": "100/m",
        },
        "smart_linker_task": {
            "queue": "email",
            "rate_limit": "100/m",
        },
    },
)

app.conf.task_time_limit = 30 * 60
app.conf.task_soft_time_limit = 15 * 60

app.conf.task_default_retry_delay = 180
app.conf.task_max_retries = 3

# Set up periodic tasks
app.conf.beat_schedule = {
    "refresh-edges-materialized-view-every-night": {
        "task": "entries.tasks.refresh_edges_materialized_view",
        "schedule": crontab(hour=3, minute=0),
        "kwargs": json.dumps(
            {
                "simulate": True,
            }
        ),
    },
    "delete-hanging-artifacts-every-night": {
        "task": "entries.tasks.delete_hanging_artifacts",
        "schedule": crontab(hour=2, minute=0),
    },
}
