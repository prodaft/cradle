from celery import Celery

from core import decorators
from core.decorators import debounce_task


class FakeRedis:
    def __init__(self):
        self.keys = set()

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.keys:
            return None
        self.keys.add(key)
        return True


def _debounced_task(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(decorators.redis.Redis, "from_url", lambda url: redis)
    app = Celery("debounce-test", set_as_current=False)
    calls = []

    @app.task(name="debounce.test")
    def task(*args, **kwargs):
        pass

    monkeypatch.setattr(
        task, "apply_async", lambda args=None, kwargs=None, **options: calls.append((args, kwargs, options))
    )
    return debounce_task(timeout=60)(task), calls


def test_debounce_merges_identical_calls(monkeypatch):
    """A repeat call with the same arguments inside the window is dropped."""
    task, calls = _debounced_task(monkeypatch)

    task.delay(1, mode="a")
    task.delay(1, mode="a")

    assert calls == [((1,), {"mode": "a"}, {"countdown": 60})]


def test_debounce_keeps_calls_with_different_arguments(monkeypatch):
    """Calls with different arguments are debounced separately, so none is lost."""
    task, calls = _debounced_task(monkeypatch)

    task.delay(1)
    task.delay(2)
    task.apply_async(kwargs={"mode": "b"})

    assert [(args, kwargs) for args, kwargs, _ in calls] == [((1,), {}), ((2,), {}), (None, {"mode": "b"})]


def test_debounce_force_schedules_immediately(monkeypatch):
    """force=True bypasses the debounce and drops the countdown."""
    task, calls = _debounced_task(monkeypatch)

    task.delay(1)
    task.apply_async((1,), force=True)

    assert calls == [((1,), {}, {"countdown": 60}), ((1,), None, {})]
