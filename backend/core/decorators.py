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


def debounce_task(timeout):
    """
    A decorator for Celery tasks to debounce calls.

    Normally, the first call schedules the task for execution after `timeout` seconds.
    All subsequent calls within the debounce window are ignored.

    Pass `force=True` as a keyword argument to bypass the debounce and schedule the task immediately.

    How it works:
      - On the first call, a unique key (based on the task name) is set in Redis with an expiration
        equal to `timeout`. The task is then scheduled to run after the delay.
      - Subsequent calls during the timeout period find the key already exists, and so the task is not re-scheduled.
      - If `force=True` is provided, the task executes immediately and the debounce check is skipped.

    Example usage:

        from celery import shared_task

        @shared_task
        @debounce_task(timeout=120)
        def my_task(param):
            # Task logic here
            print("Executing task with", param)

        # Example calls:
        my_task.delay("first call")        # Schedules execution after 120 seconds.
        my_task.delay("second call")       # Ignored if called within 120 seconds.
        my_task.delay("forced call", force=True) # Bypasses debounce and executes immediately.
    """

    def decorator(task):
        original_apply_async = task.apply_async

        @functools.wraps(task.apply_async)
        def debounced_apply_async(*args, **kwargs):
            redis_client = redis.Redis.from_url(settings.REDIS_URL)
            # Check if the caller wants to force execution, bypassing debounce.
            force = kwargs.pop("force", False)
            if force:
                return original_apply_async(*args, **kwargs)

            # Create a unique debounce key based on the task name.
            key = f"debounce:{task.name}"
            # Attempt to set the key in Redis; if successful, schedule the task after the timeout.
            if redis_client.set(key, "1", nx=True, ex=timeout):
                kwargs.setdefault("countdown", timeout)
                return original_apply_async(*args, **kwargs)
            else:
                # The key exists, so the task was already scheduled; ignore this call.
                return None

        # Override apply_async to implement our debounce logic.
        task.apply_async = debounced_apply_async
        return task

    return decorator
