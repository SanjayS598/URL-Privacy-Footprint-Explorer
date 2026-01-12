# Celery task definitions for background job processing.
from celery import Celery
from config import settings

# Create Celery app
celery_app = Celery(
    "privacy_scanner",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)


@celery_app.task(name="run_scan")
def run_scan(scan_id: str, strict_config: dict):
    # Execute a privacy scan for a given scan_id.
    # This task is queued by the API and executed by the worker.
    # The actual implementation is in the worker service.
    # Args:
    #   scan_id: UUID of the scan to execute
    #   strict_config: Configuration for strict mode blocking
    # This is just a stub - the real implementation is in apps/worker
    pass
