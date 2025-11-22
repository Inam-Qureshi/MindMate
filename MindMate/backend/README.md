# MindMate Backend API

A comprehensive mental health platform backend built with FastAPI.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Redis 6+ (optional, for caching)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd mm/backend1

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Using Make

```bash
make install        # Install dependencies
make run            # Run development server
make test           # Run tests
make lint           # Lint code
make format         # Format code
```

### Using Docker

```bash
docker-compose up -d
```

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Architecture**: [docs/architecture/](docs/architecture/)
- **API Guide**: [docs/api/](docs/api/)
- **Deployment**: [docs/deployment/](docs/deployment/)

## 🏗️ Project Structure

```
app/
├── api/          # API endpoints
├── core/         # Core functionality
├── db/           # Database
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
├── agents/       # AI agents
└── utils/        # Utilities
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov

# Run specific test type
pytest tests/unit
pytest tests/integration
pytest tests/e2e
```

## 🔧 Development

### Code Quality

```bash
# Format code
black .
isort .

# Lint
flake8 app/
mypy app/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🚀 Deployment

See [docs/deployment/](docs/deployment/) for deployment guides.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📄 License

[MIT License](LICENSE)

## 🔒 Security

See [SECURITY.md](SECURITY.md) for security policy.

