# URL Privacy Footprint Explorer

[![Tests](https://github.com/YOUR_USERNAME/URL-Privacy-Footprint-Explorer/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/URL-Privacy-Footprint-Explorer/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](https://github.com/YOUR_USERNAME/URL-Privacy-Footprint-Explorer)

A comprehensive full-stack web application that analyzes websites for privacy concerns by scanning URLs, tracking third-party requests, detecting fingerprinting techniques, analyzing cookies, and measuring browser storage usage.

## Features

- **Deep Privacy Analysis** - Comprehensive scanning of websites to detect privacy threats
- **Fingerprinting Detection** - Identifies canvas, WebGL, audio, and font fingerprinting techniques
- **Privacy Score** - 0-100 weighted score based on third-party tracking, cookies, and storage
- **Network Graph** - Interactive visualization of third-party domain connections
- **Cookie Analysis** - Detailed breakdown of first-party, third-party, session, and persistent cookies
- **Screenshot Capture** - Visual evidence of scanned pages
- **Scan Comparison** - Side-by-side comparison of baseline vs strict mode
- **Modern UI** - Dark themed, glassmorphic design with smooth animations
- **Real-time Updates** - Live scan status with automatic polling

## Architecture

**Frontend:**
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS for styling
- React Flow for network visualization
- Real-time scan status updates

**Backend API:**
- FastAPI (Python) - REST API with automatic OpenAPI docs
- SQLAlchemy ORM + Alembic migrations
- PostgreSQL database
- Redis for Celery task queue
- MinIO (S3-compatible) for artifact storage

**Worker:**
- Celery for background job processing
- Playwright + Chromium for browser automation
- Advanced fingerprinting detection
- Tracker domain detection (500+ domains)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- (Optional) Node.js 18+ for local frontend development

### Running with Docker (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/URL-Privacy-Footprint-Explorer.git
cd URL-Privacy-Footprint-Explorer
```

2. **Start all services**
```bash
cd infra
docker compose up -d
```

3. **Access the application**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (admin/admin)

4. **View logs**
```bash
docker compose logs -f web    # Frontend logs
docker compose logs -f api    # API logs
docker compose logs -f worker # Worker logs
```

5. **Stop services**
```bash
docker compose down
```

### Local Development Setup

**Backend API:**
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Worker:**
```bash
cd apps/worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
celery -A worker worker --loglevel=info
```

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

## API Documentation

### Create Scan
```bash
POST http://localhost:8000/api/scans
Content-Type: application/json

{
  "url": "https://example.com",
  "profiles": ["baseline", "strict"]
}
```

### Get Scan Status
```bash
GET http://localhost:8000/api/scans/{scan_id}
```

### Get Full Report
```bash
GET http://localhost:8000/api/scans/{scan_id}/report
```

### Get Network Graph
```bash
GET http://localhost:8000/api/scans/{scan_id}/graph
```

### Compare Scans
```bash
POST http://localhost:8000/api/compare
Content-Type: application/json

{
  "scan_a_id": "uuid-1",
  "scan_b_id": "uuid-2"
}
```

**Interactive API Docs:** http://localhost:8000/docs

## Testing

**Run API tests:**
```bash
cd apps/api
pip install -r requirements-dev.txt
pytest tests/ -v --cov=. --cov-report=term-missing
```

**Test Coverage:** 96% (47 tests passing)

**CI/CD:** GitHub Actions automatically runs tests on every push and pull request.

## How It Works

1. **URL Submission** - User submits a URL with optional scan profiles (baseline/strict)
2. **Task Queuing** - API creates scan records and enqueues Celery tasks
3. **Browser Automation** - Worker launches headless Chromium via Playwright
4. **Network Interception** - All HTTP requests are captured and analyzed
5. **Fingerprinting Detection** - JavaScript execution is monitored for fingerprinting APIs
6. **Data Collection** - Cookies, localStorage, IndexedDB, and other storage are extracted
7. **Analysis** - Privacy score calculated based on third-party domains, cookies, and trackers
8. **Artifact Storage** - Screenshots and HAR files uploaded to MinIO
9. **Results Display** - Frontend polls API and displays comprehensive report

## Privacy Score Calculation

Score components (0-100, higher is better):
- **Third-party domains** (40%) - Fewer domains = better score
- **Cookies set** (30%) - Fewer cookies = better score  
- **Storage usage** (20%) - Less storage = better score
- **Tracker detection** (10%) - Fewer trackers = better score

## Project Structure

```
URL-Privacy-Footprint-Explorer/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── main.py       # API routes
│   │   ├── models.py     # Database models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── database.py   # DB connection
│   │   ├── config.py     # Settings
│   │   └── tests/        # Unit tests (96% coverage)
│   ├── worker/           # Celery worker
│   │   ├── worker.py     # Scan execution
│   │   ├── fingerprinting.py  # Fingerprinting detection
│   │   └── tests/        # Worker tests
│   └── web/              # Next.js frontend
│       ├── app/          # App router pages
│       ├── components/   # React components
│       └── lib/          # Utilities
├── infra/
│   ├── docker-compose.yml    # Service orchestration
│   └── tracker_lists/        # Tracker blocklists
└── .github/
    └── workflows/
        └── test.yml      # CI/CD pipeline
```

## Technologies

**Frontend:**
- Next.js 14.1, React 18.2, TypeScript 5.3
- Tailwind CSS 3.4, React Flow 12.3
- Axios for API calls

**Backend:**
- FastAPI 0.128, SQLAlchemy 2.0, Alembic 1.18
- Celery 5.6, Redis 7.1
- Playwright 1.41, Chromium

**Infrastructure:**
- PostgreSQL 16, Redis 7, MinIO (S3)
- Docker & Docker Compose
- GitHub Actions CI/CD

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Quality:**
- Write tests for new features
- Maintain 95%+ test coverage
- Follow existing code style
- Update documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- EasyList tracker domains for blocklist
- Playwright team for browser automation
- FastAPI and Next.js communities

## Contact

For questions or support, please open an issue on GitHub.

---

**Built with care for privacy-conscious users**
