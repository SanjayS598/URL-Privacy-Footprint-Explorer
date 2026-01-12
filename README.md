# Privacy Footprint Explorer

A full-stack web application that analyzes websites for privacy concerns by scanning URLs and tracking third-party requests, cookies, and browser storage usage.

## Project Status: Phase 1 Complete - Backend Skeleton Ready

### What's Implemented

**Infrastructure:**
- Docker Compose configuration (Postgres, Redis, MinIO, API, Worker, Web)
- Complete project directory structure
- Tracker blocklist with common advertising/analytics domains

**Backend API (FastAPI):**
- Database models for all entities (scans, domains, cookies, storage, artifacts)
- Alembic migrations setup with initial schema
- All REST API endpoints defined:
  - `POST /api/scans` - Create new scan jobs
  - `GET /api/scans/{id}` - Get scan status
  - `GET /api/scans/{id}/report` - Get full report
  - `GET /api/scans/{id}/graph` - Get graph visualization data
  - `POST /api/compare` - Compare two scans
  - `GET /api/scans` - List recent scans
  - `GET /health` - Health check
- Pydantic schemas for request/response validation
- Celery task definitions (stub for worker)
- SSRF protection in URL validation

### What's Next (Phase 2)

1. **Worker Implementation** - Celery worker with Playwright scanner
2. **Frontend** - Next.js app with React Flow graphs
3. **End-to-end testing** - Verify complete workflow

---

## Prerequisites

Before you start, you need to install:

1. **Docker Desktop for Mac**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start the application
   - Verify: `docker --version` and `docker compose version`

2. **Node.js (LTS version 20+)**
   - Download from: https://nodejs.org/
   - Or install via Homebrew:
     ```bash
     # Install Homebrew if you don't have it
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     
     # Install Node.js
     brew install node
     ```
   - Verify: `node --version` and `npm --version`

3. **Python 3.11+** (already installed)

---

## Quick Start

### 1. Set Up Python Environment

```bash
# Navigate to project directory
cd /Users/sanjays/Desktop/Projects/URL-Privacy-Footprint-Explorer

# Activate the virtual environment
source venv/bin/activate

# Install API dependencies
pip install -r apps/api/requirements.txt
```

### 2. Test the API Locally (without Docker)

You can verify the API code has no syntax errors:

```bash
cd apps/api
python -c "import main; print('[OK] API code is valid')"
```

### 3. Start Services with Docker

Once Docker is installed:

```bash
cd infra
docker compose up -d
```

This will start:
- **Postgres** (port 5432) - Database
- **Redis** (port 6379) - Message broker for Celery
- **MinIO** (port 9000, console 9001) - S3-compatible object storage
- **API** (port 8000) - FastAPI backend
- **Worker** (not yet implemented)
- **Web** (not yet implemented)

### 4. Verify Services

```bash
# Check all containers are running
docker compose ps

# Test API health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","service":"privacy-api"}
```

### 5. Access Services

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **MinIO Console**: http://localhost:9001 (login: minioadmin/minioadmin)

---

## Project Architecture

```
URL-Privacy-Footprint-Explorer/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── main.py            # API endpoints
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # DB connection
│   │   ├── config.py          # Settings
│   │   ├── tasks.py           # Celery tasks
│   │   ├── alembic/           # Database migrations
│   │   ├── requirements.txt   # Python dependencies
│   │   └── Dockerfile
│   │
│   ├── worker/                # Celery worker (Phase 2)
│   │   └── (to be implemented)
│   │
│   └── web/                   # Next.js frontend (Phase 2)
│       └── (to be implemented)
│
├── infra/
│   ├── docker-compose.yml     # Service orchestration
│   └── tracker_lists/
│       └── default.json       # Known tracker domains
│
└── venv/                      # Python virtual environment
```

---

## Database Schema

### Tables

**scans** - Main scan records
- Tracks URL, status, timing, and privacy metrics
- Fields: url, base_domain, profile (baseline/strict), status, privacy_score, etc.

**domain_aggregates** - Per-domain statistics
- Aggregated request counts, bytes, and resource types per domain

**cookies** - Individual cookies detected
- Cookie details with expiration and third-party classification

**storage_summary** - Browser storage usage
- localStorage, IndexedDB, and Service Worker presence

**artifacts** - S3/MinIO references
- Links to raw data: network logs, storage dumps, screenshots

---

## API Endpoints

### Create Scan
```bash
POST /api/scans
{
  "url": "https://example.com",
  "profiles": ["baseline", "strict"],
  "strict_config": {
    "block_third_party": false,
    "allowlist_domains": []
  }
}
```

### Get Scan Status
```bash
GET /api/scans/{scan_id}
```

### Get Full Report
```bash
GET /api/scans/{scan_id}/report
```

### Get Graph Data
```bash
GET /api/scans/{scan_id}/graph
```

### Compare Scans
```bash
POST /api/compare
{
  "scan_a_id": "uuid",
  "scan_b_id": "uuid"
}
```

---

## Testing the Current Implementation

Even without the worker, you can test the API:

```bash
# Create a scan (will be queued but not processed yet)
curl -X POST http://localhost:8000/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "profiles": ["baseline"]
  }'

# Get scan status (will show "queued")
curl http://localhost:8000/api/scans/{scan_id}

# List all scans
curl http://localhost:8000/api/scans
```

---

## Development Workflow

### Running API in Development Mode

```bash
cd apps/api
source ../../venv/bin/activate

# Start just the database services
cd ../../infra
docker compose up -d postgres redis minio minio-init

# Run API locally (with hot reload)
cd ../apps/api
uvicorn main:app --reload --port 8000
```

### Database Migrations

```bash
cd apps/api

# Create a new migration (auto-generate from models)
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

### Viewing Logs

```bash
cd infra

# All services
docker compose logs -f

# Specific service
docker compose logs -f api
```

### Stopping Services

```bash
cd infra
docker compose down

# Remove volumes too (clears database)
docker compose down -v
```

---

## How It Works (High-Level)

### Baseline Mode
1. User submits a URL via the web UI
2. API creates a scan record and enqueues a Celery task
3. Worker launches headless Chromium and visits the URL
4. Worker collects: network requests, cookies, storage usage, screenshot
5. Worker computes privacy score and saves results to database
6. Frontend displays interactive graph of third-party domains

### Strict Mode
Same as baseline, but:
- Blocks known tracker domains from the blocklist
- Optionally blocks all third-party requests (with allowlist)
- Compare page shows what was blocked and privacy improvement

### Privacy Score Calculation
```python
score = 100
score -= third_party_domains * 2  (cap 40)
score -= cookies_set * 1           (cap 20)
score -= tracker_domains * 4       (cap 25)
score -= localstorage_keys * 0.5   (cap 10)
score = max(0, min(100, score))
```

---

## Key Features

- **No Authentication** (v1) - Simple, stateless scans
- **SSRF Protection** - Blocks localhost and private IP ranges
- **Dual-Mode Scanning** - Baseline vs. Strict comparison
- **Visual Graph** - Interactive domain relationship tree (Phase 2)
- **Evidence Panel** - Click nodes to see detailed breakdown (Phase 2)
- **Artifact Storage** - Raw data preserved in MinIO for verification

---

## Troubleshooting

### "Connection refused" errors
- Make sure Docker is running
- Check services: `docker compose ps`
- Verify ports aren't in use: `lsof -i :5432,6379,8000,9000`

### Database migrations fail
```bash
cd infra
docker compose down -v  # Clear database
docker compose up -d postgres
cd ../apps/api
alembic upgrade head
```

### API won't start
- Check logs: `docker compose logs api`
- Verify Python dependencies: `pip install -r apps/api/requirements.txt`
- Test imports: `python -c "import main"`

---

## Environment Variables

See `apps/api/.env.example` for all configuration options.

When running in Docker, these are set in `docker-compose.yml`.
When running locally, copy `.env.example` to `.env` and adjust values.

---

## Next Steps

**To continue with Phase 2:**

1. **Implement Worker** (`apps/worker/`)
   - Celery app with Playwright
   - Domain extraction and classification logic
   - MinIO upload functionality
   - Database write operations

2. **Build Frontend** (`apps/web/`)
   - Next.js with TypeScript
   - React Flow for graph visualization
   - Tailwind CSS for styling
   - API integration

3. **End-to-End Testing**
   - Test with real websites
   - Verify strict mode blocking
   - Validate compare functionality

---

## Technology Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic
- **Database**: PostgreSQL 16
- **Queue**: Redis + Celery
- **Storage**: MinIO (S3-compatible)
- **Worker**: Playwright (Chromium)
- **Frontend**: Next.js, React Flow (Phase 2)
- **Infrastructure**: Docker Compose

---

## License

MIT (or your choice)

---

## Contributing

This is a learning/portfolio project. Feel free to fork and extend!

---

**Current Status**: Phase 1 Complete - Ready to implement worker and frontend!
