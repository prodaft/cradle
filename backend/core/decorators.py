import functools
import redis
from inspect import getfullargspec
from django.conf import settings
from django.db import close_old_connections
from celery import current_task
from redis_lock import Lock


def distributed_lock(
    lock_name_template, timeout=3600, retry_countdown=60, expire=7200, max_retries=3
):
    """
    Distributed lock decorator using Redis.

    Args:
        lock_name_template: String template for lock name (e.g. "task_{arg_name}")
        timeout: Maximum lock duration in seconds
        retry_countdown: Retry delay if lock is held
        expire: Lock expiration in seconds
        max_retries: Maximum number of retries if lock cannot be acquired
    """

    def decorator(task_func):
        @functools.wraps(task_func)
        def wrapper(*args, **kwargs):
            try:
                # Resolve lock name from task arguments
                argspec = getfullargspec(task_func)
                arg_dict = {}

                # Populate positional arguments
                for i, arg in enumerate(args):
                    if i < len(argspec.args):
                        arg_name = argspec.args[i]
                        arg_dict[arg_name] = arg

                # Add keyword arguments
                arg_dict.update(kwargs)

                # Format lock name
                lock_name = lock_name_template.format(**arg_dict)

                # Create Redis client
                redis_client = redis.Redis.from_url(settings.REDIS_URL)

                # Acquire lock
                lock = Lock(redis_client, lock_name, expire=expire)
                if lock.acquire(blocking=True, timeout=timeout):
                    try:
                        result = task_func(*args, **kwargs)
                        return result
                    finally:
                        lock.release()
                else:
                    # Get the current number of retries (default to 0 if not available)
                    retries = getattr(current_task.request, "retries", 0)
                    if retries < max_retries:
                        current_task.retry(countdown=retry_countdown)
                    else:
                        raise Exception("Max retries reached for distributed lock")
            finally:
                close_old_connections()

        return wrapper

    return decorator
