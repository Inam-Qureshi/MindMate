# MindMate Backend Structure Documentation

**Version**: 2.0.0  
**Last Updated**: October 30, 2025  
**Purpose**: Comprehensive documentation of the MindMate backend file structure

---

## 📋 Overview

MindMate is a comprehensive mental health platform built with FastAPI, PostgreSQL, and Redis. The backend provides:
- Patient assessment and diagnostic system
- Specialist matching and appointment management
- Mental health chatbot and AI agents
- Progress tracking and mood monitoring
- Community forum and journaling
- Admin management system

---

## 🏗️ Root Directory Structure

```
mm/backend/
├── agents/                      # AI Agents (Chatbot, PIMA, SMA, TPA, DA)
├── alembic/                     # Database migrations (Alembic)
├── appointments/                # Appointment system (new modular structure)
├── assessment/                  # Modular assessment system
├── core/                        # Core configuration and settings
├── database/                    # Database connection and utilities
├── docs/                        # Documentation files
├── migrations/                  # SQL migration scripts
├── models/                      # Database models (SQL and Pydantic)
├── routers/                     # API route handlers
├── schemas/                     # Request/response schemas
├── scripts/                     # Utility scripts
├── services/                    # Business logic services
├── uploads/                     # File uploads (specialist documents)
├── utils/                       # Utility functions and helpers
├── venv312/                     # Python virtual environment
├── alembic.ini                  # Alembic configuration
├── apppointment_workflow.md     # Appointment workflow documentation
├── main.py                      # FastAPI application entry point
└── requirements.txt             # Python dependencies
```

---

## 📁 Detailed Directory Breakdown

### `/agents/` - AI Agents System

The agents directory contains specialized AI agents for different tasks in the MindMate platform.

```
agents/
├── __init__.py                  # Package initialization
├── llm_client.py                # Shared LLM client for all agents
├── chatbot/                     # WhatsApp-style mental health chatbot
│   ├── chatbot.py              # Core chatbot logic
│   ├── chatbot_router.py       # FastAPI endpoints for chatbot
│   ├── llm_client.py           # Groq API integration
│   └── README.md               # Chatbot documentation and setup guide
├── da/                         # Data Analysis Agent (placeholder)
│   └── __init__.py
├── pima/                       # Patient Intake & Mental Assessment Agent
│   ├── __init__.py
│   ├── pima.py                 # Main PIMA orchestrator
│   ├── pima_llm_wrapper.py     # LLM wrapper for PIMA
│   ├── pima_routes.py          # PIMA API routes
│   ├── pima_schemas.py         # PIMA data schemas
│   ├── basic_info/             # Basic patient information collection
│   │   ├── basic_info_bot.py   # Demographics collector
│   │   ├── concern_bot.py      # Presenting concerns collector
│   │   ├── llm_client.py       # LLM integration
│   │   ├── patients_preference_collector.py  # Patient preferences
│   │   └── risk_assessment.py  # Initial risk screening
│   └── scid/                   # Structured Clinical Interview (SCID)
│       ├── dsm_criteria_bank.py  # DSM-5 diagnostic criteria
│       ├── scid_cv/            # SCID Clinical Version
│       │   ├── base_types.py   # Base types and enums
│       │   ├── module_selector.py  # Module selection logic
│       │   ├── modules/        # Individual disorder modules
│       │   │   ├── adhd.py
│       │   │   ├── adjustment_disorder.py
│       │   │   ├── agoraphobia.py
│       │   │   ├── alcohal_use.py
│       │   │   ├── bipolar_disorder.py
│       │   │   ├── eating_disorder.py
│       │   │   ├── gad.py
│       │   │   ├── mdd.py
│       │   │   ├── ocd.py
│       │   │   ├── panic_disorder.py
│       │   │   ├── psychotic_disorder.py
│       │   │   ├── ptsd.py
│       │   │   ├── social_anxiety.py
│       │   │   ├── specific_phobia.py
│       │   │   └── substance_use.py
│       │   └── utils.py        # SCID utilities
│       ├── scid_pd/            # SCID Personality Disorders
│       │   ├── base_types.py
│       │   ├── modules/
│       │   │   ├── antisocial_pd.py
│       │   │   ├── avoidant_pd.py
│       │   │   ├── borderline_pd.py
│       │   │   ├── dependent_pd.py
│       │   │   └── narcissistic_pd.py
│       │   └── utils.py
│       └── scid_sc.py          # SCID Screening Module
├── sma/                        # Specialist Matching Agent
│   ├── __init__.py
│   ├── sma.py                  # Main SMA orchestrator
│   ├── specialits_matcher.py   # Specialist matching algorithm
│   ├── appointments_manager.py # Appointment lifecycle management
│   ├── geo_locater.py          # Location-based matching
│   ├── sma_schemas.py          # SMA data schemas
│   └── README.md               # SMA documentation
└── tpa/                        # Treatment Planning Agent (placeholder)
    └── __init__.py
```

**Key Features**:
- **Chatbot**: Friendly, WhatsApp-style mental health support bot
- **PIMA**: Comprehensive patient intake with SCID-based diagnosis
- **SMA**: Intelligent specialist matching and appointment booking
- **DA**: Data analysis for patient insights (planned)
- **TPA**: Treatment plan generation (planned)

---

### `/alembic/` - Database Migrations

```
alembic/
├── env.py                      # Alembic environment configuration
├── script.py.mako              # Migration script template
├── README                      # Alembic documentation
└── versions/                   # Migration version files
    ├── 54f1bdb36107_initial_migration.py
    ├── 1893b77224a3_add_questionnaire_tables.py
    ├── 12813cbbd1ec_update_questionnaire_and_patient_models.py
    ├── 2d133919a49f_make_city_nullable.py
    ├── 83d9858f5e75_add_progress_tracking_tables.py
    ├── 9294fdf6e9a0_make_appointment_dates_nullable_for_.py
    ├── add_assessment_module_tables.py
    ├── add_forum_question_specialist_support.py
    ├── add_forum_reports_table_simple.py
    ├── add_forum_reports_table.py
    ├── d2f9a89ff6fc_merge_multiple_heads.py
    ├── e6a3125ec3eb_add_progress_tracking_tables_v2.py
    ├── ebb9e18786d5_rename_mood_recommendations_to_reasoning.py
    ├── ecba55ec568f_add_missing_otp_columns_to_patient_auth_.py
    ├── f979d551502a_add_journal_and_community_tables.py
    └── rename_community_to_forum_tables.py
```

**Purpose**: Database schema versioning and migration management using Alembic.

---

### `/appointments/` - New Appointment System

Modular appointment system with clean separation of concerns.

```
appointments/
├── dependencies.py             # Dependency injection for appointments
├── core/                       # Core business logic
│   └── appointment_service.py  # Appointment service layer
├── routers/                    # API endpoints
│   └── appointments.py         # Appointment route handlers
├── schemas/                    # Data validation schemas
│   └── appointment_schemas.py  # Pydantic schemas for appointments
└── utils/                      # Utilities
    └── email_utils.py          # Email notifications for appointments
```

**Features**:
- Instant booking and confirmation
- In-person and online appointments
- Payment verification for online sessions
- Rescheduling and cancellation
- Email notifications

---

### `/assessment/` - Modular Assessment System

Comprehensive modular assessment system with ReAct architecture.

```
assessment/
├── __init__.py                 # Package exports
├── base_module.py              # Abstract base class for assessment modules
├── config.py                   # Module registry and configuration
├── database.py                 # Database management (legacy SQLite)
├── database_migration.sql      # PostgreSQL migration script
├── enhanced_llm.py             # Enhanced LLM wrapper with confidence scoring
├── llm.py                      # Basic LLM client
├── moderator.py                # Central assessment orchestrator (1382 lines)
├── module_types.py             # Shared data types and enums
├── react_nodes.py              # ReAct architecture implementation
├── IMPLEMENTATION_SUMMARY.md   # Implementation details
├── LLM_INTEGRATION_PLAN.md     # LLM integration strategy
├── README.md                   # Comprehensive system documentation
├── concern/                    # Presenting concerns module
│   ├── __init__.py
│   ├── module.py              # Concern module implementation
│   └── concern_collector.py    # Concern collection logic
├── demographics/               # Demographics collection module
│   ├── __init__.py
│   ├── module.py              # Demographics module implementation
│   └── collector.py            # Demographics collector
└── risk_assessment/            # Risk assessment module
    ├── __init__.py
    ├── module.py              # Risk assessment implementation
    ├── risk_collector.py       # Risk data collector
    └── risk_data.py            # Risk assessment data structures
```

**Architecture**:
- **Moderator**: Orchestrates module flow and transitions
- **ReAct System**: Observe → Reason → Action → Validate → Learn
- **Modules**: Self-contained assessment components
- **PostgreSQL**: Full database integration with patient records

---

### `/core/` - Core Configuration

```
core/
├── __init__.py
└── config.py                   # Application settings and environment variables
```

**Configuration Includes**:
- Database connection (PostgreSQL)
- Redis configuration
- JWT and security settings
- Server settings (host, port, debug)
- CORS settings

---

### `/database/` - Database Layer

```
database/
├── __init__.py                 # Package initialization
├── database.py                 # Database connection, session management
├── get_data.py                 # Data retrieval utilities
└── reset_db.py                 # Database reset utilities
```

**Features**:
- SQLAlchemy engine and session management
- Redis client singleton
- Health checks (database and Redis)
- Connection pooling and error handling

---

### `/docs/` - Documentation

```
docs/
└── SPECIALIST_INDUCTION_PROCESS.md  # Specialist onboarding documentation
```

**Contents**: Complete specialist registration process, required documents, ethics declaration, and validation rules.

---

### `/migrations/` - SQL Migration Scripts

```
migrations/
├── add_cnic_to_specialists.sql
├── add_extended_profile_fields.sql
├── add_specialist_profile_fields.sql
├── add_weekly_schedule_fields.py
├── application_tracking_schema.sql
├── phase1_database_updates.sql
├── phase1_simple_migration.sql
├── phase1_step_by_step.sql
├── phase1_step2.sql
├── phase1_step3.sql
└── professional_appointment_workflow.sql
```

**Purpose**: SQL scripts for manual database schema updates and migrations.

---

### `/models/` - Database Models

```
models/
├── __init__.py                 # Model exports and registry
├── pydantic_models/            # Request/response validation models
│   ├── __init__.py
│   ├── authentication_schemas.py      # Auth request/response schemas
│   ├── forum_pydantic_models.py       # Forum schemas
│   ├── mood_schemas.py                # Mood tracking schemas
│   ├── patient_profile_schemas.py     # Patient profile schemas
│   ├── patient_pydantic_models.py     # Patient data schemas
│   ├── progress_schemas.py            # Progress tracking schemas
│   ├── specialist_appointment_schemas.py  # Appointment schemas
│   ├── specialist_profile_schema.py   # Specialist profile schemas
│   ├── specialist_profile_schemas.py  # Additional specialist schemas
│   ├── users_management_schema.py     # User management schemas
│   └── weekly_schedule_schemas.py     # Schedule schemas
└── sql_models/                 # SQLAlchemy ORM models
    ├── __init__.py
    ├── base_model.py          # Base model with common fields
    ├── admin_models.py        # Admin user models
    ├── appointments_model.py  # Appointment models
    ├── assessment_models.py   # Assessment system models
    ├── clinical_models.py     # Clinical data models
    ├── forum_models.py        # Forum and community models
    ├── journal_models.py      # Journal entry models
    ├── mood_models.py         # Mood tracking models
    ├── patient_models.py      # Patient and auth models
    ├── progress_models.py     # Progress tracking models
    ├── questionnaire_models.py  # Questionnaire models
    ├── review_models.py       # Review and rating models
    ├── session_models.py      # Session management models
    ├── specialist_favorites.py  # Favorite specialists
    └── specialist_models.py   # Specialist and auth models
```

**Key Models**:
- **Patient**: Demographics, auth, history, preferences, risk assessment
- **Specialist**: Profile, credentials, specializations, documents
- **Appointments**: Booking, scheduling, status tracking
- **Assessment**: Sessions, modules, results, conversations
- **Forum**: Questions, answers, reports
- **Progress**: Goals, achievements, streaks, exercise tracking
- **Mood**: Assessments, trends, AI insights

---

### `/routers/` - API Route Handlers

```
routers/
├── __init__.py                 # Router registration and consolidation
├── appointments.py             # Appointment routes
├── assessment.py               # Assessment system routes
├── auth.py                     # Authentication and authorization
├── chat.py                     # Chat and chatbot functionality
├── dashboard.py                # Unified dashboard endpoints
├── exercises.py                # Mental health exercises
├── forum.py                    # Community forum
├── specialist_favorites.py     # Favorite specialists management
├── specialist_profile.py       # Specialist profile management
├── specialist_profile_completion.py  # Profile completion tracking
├── specialist_registration.py  # Specialist onboarding
├── specialist_slots.py         # Availability slot management
├── specialists.py              # Specialist search and discovery
├── users.py                    # User profile management
├── verification.py             # Email verification
├── weekly_schedule.py          # Weekly schedule management
├── admin/                      # Admin endpoints
│   ├── __init__.py
│   ├── admin.py               # General admin operations
│   ├── specialist_application_review.py  # Review applications
│   ├── specialist_applications.py  # Application management
│   └── specialist_management.py  # Specialist CRUD operations
├── journal/                    # Journaling system
│   ├── __init__.py
│   └── journal.py             # Journal entry CRUD
├── progress/                   # Progress tracking
│   ├── __init__.py
│   ├── mood.py                # Mood tracking endpoints
│   ├── progress.py            # Progress tracking endpoints
│   └── mood_tracking/         # Mood tracking AI agent
│       ├── __init__.py
│       ├── agent.py           # Mood analysis AI agent
│       └── llm_client.py      # LLM integration for mood
└── questionnaires/             # Questionnaire system
    ├── __init__.py
    └── questionnaires.py      # Questionnaire CRUD and submission
```

**API Structure**:
- `/api/auth/*` - Authentication
- `/api/specialists/*` - Specialist search and profiles
- `/api/appointments/*` - Appointment management
- `/api/assessment/*` - Assessment system
- `/api/forum/*` - Community forum
- `/api/progress/*` - Progress and mood tracking
- `/api/admin/*` - Admin operations

---

### `/schemas/` - Request/Response Schemas

```
schemas/
├── appointment_schemas.py      # Appointment request/response schemas
├── dashboard_schemas.py        # Dashboard data schemas
└── specialist_profile_crud_schemas.py  # Specialist CRUD schemas
```

**Purpose**: Centralized Pydantic schemas for API validation and documentation.

---

### `/scripts/` - Utility Scripts

```
scripts/
└── verify_specialist_email.py  # Email verification utility
```

**Purpose**: Standalone scripts for maintenance and utilities.

---

### `/services/` - Business Logic Layer

```
services/
├── __init__.py
├── dashboard_service.py        # Dashboard data aggregation
├── patient_history.py          # Patient history management
├── patient_profiles.py         # Patient profile operations
├── profile_service.py          # Profile management service
├── progress_service.py         # Progress tracking service
├── registration_service.py     # Registration workflows
├── validation_service.py       # Data validation service
├── admin/                      # Admin services
│   ├── __init__.py
│   └── users_management.py    # User management business logic
└── specialists/                # Specialist services
    ├── __init__.py
    ├── dynamic_slot_generator.py     # Auto-generate time slots
    ├── slot_management_service.py    # Slot CRUD operations
    ├── specialist_profiles.py        # Specialist profile service
    └── weekly_schedule_service.py    # Schedule management
```

**Purpose**: Business logic separated from route handlers for better testability and reusability.

---

### `/uploads/` - File Storage

```
uploads/
├── specialist_documents/       # Uploaded specialist documents
│   └── (uploaded files by specialist_id)
└── specialists/                # Specialist profile pictures
    └── (profile photos by specialist_id)
```

**File Types**:
- CNIC (front/back)
- Degree certificates
- License/registration
- Experience certificates
- Ethics declarations
- Profile photographs

---

### `/utils/` - Utility Functions

```
utils/
├── __init__.py
├── achievements_config.py      # Achievement definitions and rules
├── email_utils.py              # Email sending utilities
├── ethics_declaration.py       # Ethics declaration template
└── exercises.json              # Mental health exercises database
```

**Utilities**:
- Email templates and sending
- Achievement tracking configuration
- Ethics declaration generation
- Exercise library

---

## 🔑 Key Files

### `main.py` (387 lines)
**FastAPI Application Entry Point**

**Features**:
- Application initialization
- CORS and session middleware
- OAuth2 configuration for Swagger UI
- Global exception handlers
- Health check endpoints (live, ready, health)
- Frontend static file serving
- Custom OpenAPI schema

**Startup Flow**:
1. Load environment configuration
2. Initialize database connection
3. Set up middleware (CORS, sessions)
4. Register routers
5. Configure OpenAPI/Swagger
6. Start Uvicorn server

### `requirements.txt` (60 lines)
**Python Dependencies**

**Core Framework**:
- FastAPI 0.115.0
- Uvicorn 0.30.6
- SQLAlchemy 2.0.43
- Alembic 1.16.4

**Database**:
- PostgreSQL (psycopg2-binary 2.9.10)
- Redis 5.0.1

**AI/LLM**:
- LangChain Core 0.2.27
- LangGraph 0.2.14

**Security**:
- python-jose (JWT)
- passlib (password hashing)
- bcrypt

### `alembic.ini`
**Alembic Configuration**

Contains database URL, migration path, and Alembic settings.

### `apppointment_workflow.md`
**Appointment Workflow Documentation**

Describes the complete workflow for:
- In-person appointments (instant confirmation)
- Online appointments (payment verification)
- Status transitions
- Notifications

---

## 🗄️ Database Schema Overview

### Core Tables

**Patient System**:
- `patients` - Patient demographics
- `patient_auth_info` - Authentication credentials
- `patient_history` - Medical history
- `patient_preferences` - Treatment preferences
- `patient_presenting_concerns` - Chief complaints
- `patient_risk_assessment` - Safety screening

**Specialist System**:
- `specialists` - Specialist profiles
- `specialists_auth_info` - Authentication
- `specialist_specializations` - Areas of expertise
- `specialist_documents` - Uploaded credentials
- `specialists_approval_data` - Approval workflow

**Appointments**:
- `appointments` - Booking records
- `appointment_slots` - Time slot availability
- `weekly_schedule` - Recurring availability

**Assessment**:
- `assessment_sessions` - Session tracking
- `assessment_module_states` - Module progress
- `assessment_module_results` - Collected data
- `assessment_conversations` - Chat history
- `assessment_demographics` - Demographics data

**Community & Progress**:
- `forum_questions` - Community questions
- `forum_answers` - Responses
- `journal_entries` - Personal journals
- `mood_assessments` - Mood tracking
- `exercise_progress` - Exercise completion
- `user_goals` - Personal goals
- `user_achievements` - Gamification

**Admin**:
- `admins` - Admin users
- `admin_audit_logs` - Action tracking

---

## 🔐 Authentication & Authorization

### User Types
1. **Patient** - End users seeking mental health support
2. **Specialist** - Mental health professionals
3. **Admin** - Platform administrators

### Authentication Flow
1. Registration (email + OTP verification)
2. Login (email + password → JWT token)
3. Token validation on protected routes
4. Role-based access control (RBAC)

### Security Features
- JWT tokens with expiration
- Password hashing (bcrypt)
- OTP verification
- Session management (Redis)
- CORS protection
- Input validation (Pydantic)

---

## 🤖 AI Agent System

### Agent Types

**1. Chatbot Agent**
- **Purpose**: Friendly mental health support
- **Technology**: Groq (Llama 3.1)
- **Style**: WhatsApp-like casual conversation

**2. PIMA (Patient Intake & Mental Assessment)**
- **Purpose**: Structured diagnostic assessment
- **Technology**: SCID-based clinical interview
- **Output**: DSM-5 diagnostic impressions

**3. SMA (Specialist Matching Agent)**
- **Purpose**: Match patients with specialists
- **Algorithm**: Multi-factor weighted scoring
- **Features**: Location, specialty, budget, availability

**4. Mood Tracking Agent**
- **Purpose**: Daily mood analysis
- **Technology**: LLM-based sentiment analysis
- **Output**: Trends, insights, recommendations

---

## 📊 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Key Endpoint Groups

**Authentication** (`/auth`)
- POST `/auth/register` - Register patient
- POST `/auth/login` - Login
- POST `/auth/verify-email` - Verify email
- POST `/auth/refresh` - Refresh token

**Specialists** (`/specialists`)
- GET `/specialists/search` - Search specialists
- GET `/specialists/{id}` - Get specialist details
- GET `/specialists/{id}/slots` - Get availability

**Appointments** (`/appointments`)
- POST `/appointments/book` - Book appointment
- GET `/appointments/my-appointments` - Get my appointments
- PATCH `/appointments/{id}/cancel` - Cancel
- PATCH `/appointments/{id}/reschedule` - Reschedule

**Assessment** (`/assessment`)
- POST `/assessment/start` - Start assessment
- POST `/assessment/message` - Send message
- GET `/assessment/{id}/progress` - Get progress

**Forum** (`/forum`)
- GET `/forum/questions` - List questions
- POST `/forum/questions` - Ask question
- POST `/forum/answers` - Answer question

**Progress** (`/progress`)
- POST `/progress/mood` - Log mood
- GET `/progress/mood/trends` - Get trends
- POST `/progress/exercises` - Log exercise

**Admin** (`/admin`)
- GET `/admin/specialists/pending` - Pending approvals
- POST `/admin/specialists/{id}/approve` - Approve
- POST `/admin/specialists/{id}/reject` - Reject

---

## 🚀 Deployment Architecture

### Technology Stack
- **Backend**: FastAPI (Python 3.8+)
- **Database**: PostgreSQL 12+
- **Cache**: Redis 6+
- **Server**: Uvicorn (ASGI)
- **Migrations**: Alembic

### Environment Variables Required
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mindmatedb
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
SECRET_KEY=your_secret_key_min_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=MindMate
APP_VERSION=2.0.0
DEBUG=False
HOST=0.0.0.0
PORT=8000
```

### Running the Application

**Development**:
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
python main.py
# or
uvicorn main:app --reload
```

**Production**:
```bash
# Use multiple workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📈 Performance Considerations

### Database Optimization
- Connection pooling (max 20 connections)
- Pre-ping for stale connection detection
- Indexed foreign keys
- Optimized queries with eager loading

### Caching Strategy
- Redis for session management
- Optional caching for specialist search results
- Health check caching

### API Performance
- Async endpoints where applicable
- Pagination for large result sets
- Efficient serialization (Pydantic)

---

## 🧪 Testing

### Test Coverage Areas
- Unit tests for services
- Integration tests for routers
- Database migration tests
- API endpoint tests

### Test Commands
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific module
pytest tests/test_assessment.py
```

---

## 📝 Development Guidelines

### Code Organization
1. **Routers**: Handle HTTP requests, minimal logic
2. **Services**: Business logic, reusable across routes
3. **Models**: Database schema and validation
4. **Utils**: Helper functions, shared utilities

### Best Practices
- Type hints on all functions
- Docstrings for classes and methods
- Pydantic for validation
- Error handling with proper HTTP status codes
- Logging for debugging and monitoring

### Adding New Features
1. Create database models (`models/sql_models/`)
2. Add Pydantic schemas (`models/pydantic_models/`)
3. Implement service layer (`services/`)
4. Create router endpoints (`routers/`)
5. Register router in `routers/__init__.py`
6. Write tests
7. Update documentation

---

## 🔧 Maintenance

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Health Monitoring
- `/api/health` - Comprehensive health check
- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe

### Logs
- Application logs: console output
- Assessment logs: `logs/assessment.log` (if configured)
- Database query logs: when `DB_ECHO=True`

---

## 🎯 Future Roadmap

### Planned Features
- **Video Consultations**: Built-in video platform
- **Payment Gateway**: Integrated payment processing
- **Mobile Apps**: Native iOS/Android apps
- **Advanced Analytics**: ML-based insights
- **Multi-language Support**: Urdu, Punjabi, etc.
- **Telemedicine**: Prescription and medication tracking

### System Improvements
- Microservices architecture
- Load balancing
- Database sharding
- CDN integration
- Real-time notifications (WebSockets)

---

## 📞 Support & Contact

### Documentation
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Assessment Guide**: `assessment/README.md`
- **SMA Guide**: `agents/sma/README.md`

### Issues & Questions
- Check README files in respective modules
- Review inline code documentation
- Check migration scripts for schema changes

---

## 📚 Additional Resources

### Key Documentation Files
1. `assessment/README.md` - Assessment system guide
2. `agents/sma/README.md` - Specialist matching guide
3. `agents/chatbot/README.md` - Chatbot setup
4. `docs/SPECIALIST_INDUCTION_PROCESS.md` - Onboarding guide
5. `apppointment_workflow.md` - Appointment workflows

### External Dependencies Documentation
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [Pydantic](https://docs.pydantic.dev/)
- [Redis](https://redis.io/documentation)

---

## ✅ System Status

**Overall Status**: ✅ Production Ready

**Component Status**:
- ✅ Authentication & Authorization
- ✅ Patient Management
- ✅ Specialist Management
- ✅ Appointment System
- ✅ Assessment System (Phase 1)
- ✅ Forum & Community
- ✅ Progress Tracking
- ✅ Mood Tracking
- ✅ Chatbot System
- ✅ Specialist Matching (SMA)
- ⏳ PIMA (In Development)
- ⏳ Video Consultations (Planned)
- ⏳ Payment Integration (Planned)

---

**Document Version**: 1.0.0  
**Generated**: October 30, 2025  
**Maintainer**: MindMate Development Team

