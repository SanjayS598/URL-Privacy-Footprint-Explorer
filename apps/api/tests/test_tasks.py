import pytest
from tasks import celery_app, run_scan


def test_celery_app_configuration():
    """Test Celery app is configured correctly."""
    assert celery_app is not None
    assert celery_app.conf.task_serializer == 'json'
    assert celery_app.conf.accept_content == ['json']
    assert celery_app.conf.result_serializer == 'json'
    assert celery_app.conf.timezone == 'UTC'
    assert celery_app.conf.enable_utc is True


def test_run_scan_task_exists():
    """Test run_scan task is registered."""
    # Task should be callable
    assert callable(run_scan)
    
    # Test calling the stub (should not raise error)
    result = run_scan("test-scan-id", {})
    assert result is None  # Stub returns None


def test_celery_task_registered():
    """Test run_scan is registered as Celery task."""
    # Check task is registered with correct name
    assert "run_scan" in celery_app.tasks
