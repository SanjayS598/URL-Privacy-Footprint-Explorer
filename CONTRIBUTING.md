# Contributing to URL Privacy Footprint Explorer

Thank you for considering contributing to this project! We welcome contributions from everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

Please be respectful and constructive in all interactions. We're here to learn and build together.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Git

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/URL-Privacy-Footprint-Explorer.git
cd URL-Privacy-Footprint-Explorer

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/URL-Privacy-Footprint-Explorer.git

# Start services with Docker
cd infra
docker compose up -d
```

### Local Development (without Docker)

**Backend API:**
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Start PostgreSQL and Redis
cd ../../infra
docker compose up -d postgres redis minio minio-init

# Run API
cd ../apps/api
uvicorn main:app --reload --port 8000
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

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-tracker-detection`
- `fix/cookie-parsing-bug`
- `docs/update-api-examples`
- `refactor/improve-privacy-score`

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add pagination to scan list endpoint

fix(worker): correct cookie expiration calculation

docs(readme): update installation instructions

test(api): add tests for graph endpoint
```

## Code Style Guidelines

### Python (Backend & Worker)

- Follow PEP 8
- Use type hints
- Maximum line length: 120 characters
- Use `black` for formatting
- Use `isort` for import sorting
- Use `flake8` for linting

```bash
# Format code
black apps/api apps/worker

# Sort imports
isort apps/api apps/worker

# Check linting
flake8 apps/api apps/worker --max-line-length=120
```

### TypeScript/React (Frontend)

- Follow Next.js conventions
- Use functional components with hooks
- Use TypeScript strict mode
- Use Prettier for formatting
- Maximum line length: 100 characters

```bash
cd apps/web
npm run lint
npm run format
```

### File Organization

- Keep files focused and single-purpose
- Place related files in the same directory
- Use clear, descriptive names
- Add comments for complex logic

## Testing Requirements

### Minimum Requirements

- All new features must include tests
- Maintain minimum 95% code coverage
- All tests must pass before submitting PR
- Add both unit and integration tests where applicable

### Running Tests

**API Tests:**
```bash
cd apps/api
pytest tests/ -v --cov=. --cov-report=term-missing
```

**Worker Tests:**
```bash
cd apps/worker
pytest tests/ -v
```

**Frontend Tests:**
```bash
cd apps/web
npm test
```

### Writing Tests

- Test happy paths and edge cases
- Use descriptive test names
- Mock external dependencies
- Test error handling
- Include integration tests for API endpoints

## Submitting Changes

### Pull Request Process

1. **Update your fork:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes:**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request:**
   - Go to GitHub and create a PR from your fork
   - Fill out the PR template completely
   - Link any related issues
   - Add screenshots for UI changes

4. **PR Requirements:**
   - All tests must pass
   - Code coverage must not decrease
   - No merge conflicts
   - At least one approval required
   - All review comments addressed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

## Reporting Bugs

### Before Submitting

- Check existing issues to avoid duplicates
- Verify the bug in the latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature related to a problem?**
Description of the problem

**Describe the solution**
Clear description of what you want

**Describe alternatives**
Any alternative solutions considered

**Additional context**
Any other context, screenshots, or examples
```

## Areas for Contribution

Here are some areas where contributions are especially welcome:

### High Priority
- [ ] Add more tracker domains to blocklist
- [ ] Improve fingerprinting detection techniques
- [ ] Add more browser profiles (e.g., mobile)
- [ ] Performance optimizations for large scans
- [ ] Add scan scheduling/recurring scans

### Medium Priority
- [ ] Export reports to PDF/JSON
- [ ] Add historical trend analysis
- [ ] Improve UI/UX design
- [ ] Add more visualization options
- [ ] Better error messages

### Documentation
- [ ] Add more code comments
- [ ] Create video tutorials
- [ ] Add architecture diagrams
- [ ] Write blog posts about implementation
- [ ] Translate documentation

### Testing
- [ ] Increase test coverage to 98%+
- [ ] Add E2E tests with Cypress/Playwright
- [ ] Add performance benchmarks
- [ ] Add load testing

## Questions?

If you have questions or need help:
- Open a GitHub Discussion
- Comment on relevant issues
- Check existing documentation

## Recognition

Contributors will be recognized in the project README. Significant contributions may earn you maintainer status.

---

Thank you for contributing to URL Privacy Footprint Explorer!
