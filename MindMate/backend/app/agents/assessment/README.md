# Assessment System V2 - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Workflows](#core-workflows)
4. [Components](#components)
5. [Module System](#module-system)
6. [API Integration](#api-integration)
7. [Development Guide](#development-guide)
8. [Configuration](#configuration)

---

## Overview

The Assessment System V2 is a comprehensive, DSM-5 compliant mental health assessment platform that provides:

- **Intelligent Assessment Flow**: Automated, conversational assessment with intelligent routing
- **DSM-5 Compliance**: All modules follow DSM-5 diagnostic criteria
- **Continuous Symptom Recognition**: Real-time symptom extraction throughout the assessment
- **Comprehensive Analysis**: Diagnostic analysis and personalized treatment planning
- **Modular Architecture**: Extensible module system for easy addition of new assessments

### Key Features

- **Minimal Questions**: Optimized question sets while maintaining diagnostic accuracy
- **Intelligent Routing**: Skip logic, follow-up questions, and priority-based routing
- **Free Text Processing**: LLM-powered natural language understanding
- **Real-time Symptom Tracking**: Continuous symptom extraction and database updates
- **Comprehensive Reporting**: Detailed diagnostic reports and treatment plans

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Assessment V2 System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SRA Service (Continuous Background)                     │   │
│  │  - Processes ALL responses in real-time                  │   │
│  │  - Recognizes symptoms and attributes                    │   │
│  │  - Tracks severity, frequency, duration, triggers        │   │
│  │  - Updates symptom database continuously                 │   │
│  │  - Works throughout ENTIRE workflow                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                       │                                           │
│  1. Basic Information Modules                                    │
│     ├── Demographics ──────────────┐                            │
│     ├── Presenting Concern ────────┼─▶ SRA processes responses  │
│     └── Risk Assessment ───────────┘                            │
│                       │                                           │
│  2. SCID Screening                                               │
│     └── SCID Screening ────────────┐                            │
│                       │             │                            │
│  3. Diagnostic Modules (Dynamic)                                 │
│     ├── Mood Disorders ────────────┼─▶ SRA processes responses  │
│     ├── Anxiety Disorders ─────────┤                            │
│     ├── Trauma Disorders ──────────┤                            │
│     └── Other Disorders ───────────┘                            │
│                       │                                           │
│  4. Diagnostic Analysis (DA)                                     │
│     └── Runs AFTER all modules complete                         │
│         - Accesses ALL assessment data                           │
│         - Uses complete symptom database from SRA                │
│         - Maps to DSM-5 criteria optimally                       │
│         - Generates diagnostic report                            │
│                       │                                           │
│  5. Treatment Planning (TPA)                                     │
│     └── Runs AFTER DA completes                                  │
│         - Uses ALL information                                   │
│         - Uses DA diagnostic results                             │
│         - Uses complete symptom database                         │
│         - Creates personalized treatment plan                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
assessment_v2/
├── __init__.py
├── types.py                      # Core type definitions
├── config.py                      # Module registry and configuration
├── database.py                    # Database management
├── moderator.py                   # Main orchestrator
├── base_types.py                  # SCID module base types
│
├── core/                          # Core system components
│   ├── sra_service.py            # Continuous symptom recognition service
│   ├── symptom_database.py        # Symptom database management
│   ├── response_processor.py     # Response processing with SRA integration
│   ├── llm_response_parser.py    # LLM-based response parsing
│   ├── question_router.py        # Intelligent question routing
│   ├── question_prioritizer.py   # Question prioritization
│   ├── dsm_criteria_engine.py   # DSM-5 criteria tracking
│   └── llm/                       # LLM components
│       ├── llm_client.py         # LLM client wrapper
│       ├── enhanced_llm.py       # Enhanced LLM with confidence scoring
│       └── react_nodes.py       # ReAct orchestrator nodes
│
├── modules/                       # Assessment modules
│   ├── base_module.py            # Base module class
│   ├── basic_info/               # Basic information modules
│   │   ├── demographics.py
│   │   ├── concern.py
│   │   └── risk_assessment.py
│   ├── screening/                # Screening modules
│   │   └── scid_screening.py
│   ├── mood_disorders/           # Mood disorder modules
│   │   ├── mdd.py
│   │   └── bipolar.py
│   ├── anxiety_disorders/        # Anxiety disorder modules
│   │   ├── gad.py
│   │   ├── panic.py
│   │   ├── agoraphobia.py
│   │   ├── social_anxiety.py
│   │   └── specific_phobia.py
│   ├── trauma_disorders/         # Trauma disorder modules
│   │   ├── ptsd.py
│   │   └── adjustment.py
│   └── other_disorders/          # Other disorder modules
│       ├── ocd.py
│       ├── adhd.py
│       ├── eating_disorders.py
│       ├── alcohol_use.py
│       └── substance_use.py
│
├── agents/                       # Agent modules
│   ├── da/                       # Diagnostic Analysis
│   │   └── da_module.py         # Runs after all modules complete
│   └── tpa/                      # Treatment Planning
│       └── tpa_module.py        # Runs after DA completes
│
├── deployer/                     # Module deployment
│   ├── module_deployer.py       # Base module deployer
│   └── scid_cv_deployer.py      # SCID-CV specific deployer
│
├── selector/                     # Module selection
│   ├── module_selector.py       # Module selection logic
│   └── scid_sc_selector.py     # SCID screening selector
│
├── adapters/                     # Adapters for compatibility
│   └── base_module_adapter.py   # SCIDModule to BaseAssessmentModule adapter
│
├── utils/                        # Utility functions
│   ├── question_utils.py        # Question utilities
│   ├── question_formatter.py    # Question formatting
│   └── progress_tracker.py     # Progress tracking
│
├── reporting/                    # Reporting
│   └── comprehensive_report.py  # Comprehensive report generation
│
├── shared/                       # Shared resources
│   ├── option_sets.py           # Standard option sets
│   └── question_templates.py    # Reusable question templates
│
└── resources/                    # Resources
    └── dsm_criteria.json        # DSM-5 diagnostic criteria
```

---

## Core Workflows

### 1. Assessment Initialization Workflow

```
1. User requests assessment start
   ↓
2. AssessmentModerator initializes
   - Loads module registry from config.py
   - Initializes SRA service (background)
   - Initializes symptom database
   - Validates module dependencies
   ↓
3. Creates new session
   - Generates session_id
   - Initializes SessionState
   - Sets starting module (demographics)
   ↓
4. Returns greeting message
   - First question from demographics module
   - Session metadata
```

### 2. Message Processing Workflow

```
1. User sends message
   ↓
2. AssessmentModerator.process_message()
   - Validates session
   - Gets current module
   ↓
3. SRA Service processes response (background)
   - Extracts symptoms
   - Updates symptom database
   - Tracks attributes (severity, frequency, etc.)
   ↓
4. Current module processes message
   - Module.process_message()
   - Updates module state
   - Determines next question or completion
   ↓
5. Check module completion
   - If complete: Transition to next module
   - If not: Return next question
   ↓
6. Return response to user
   - Module response
   - Progress information
   - Session state
```

### 3. Module Transition Workflow

```
1. Current module completes
   ↓
2. AssessmentModerator checks dependencies
   - Validates prerequisites
   - Checks module order
   ↓
3. Determine next module
   - Check config for next module in sequence
   - Handle conditional flows
   - Check if DA/TPA prerequisites met
   ↓
4. Initialize next module
   - Load module class
   - Create module instance
   - Start module session
   ↓
5. Return first question from new module
```

### 4. Diagnostic Analysis (DA) Workflow

```
1. All diagnostic modules complete
   ↓
2. DA module automatically triggered
   ↓
3. DA collects all assessment data
   - All module results
   - Complete symptom database from SRA
   - Patient demographics
   - Conversation history
   ↓
4. DA performs comprehensive analysis
   - Maps symptoms to DSM-5 criteria
   - Performs diagnostic inference
   - Generates confidence scores
   - Creates diagnostic report
   ↓
5. DA stores results
   - Diagnostic conclusions
   - Supporting evidence
   - Confidence scores
   ↓
6. Triggers TPA module
```

### 5. Treatment Planning (TPA) Workflow

```
1. DA completes
   ↓
2. TPA module automatically triggered
   ↓
3. TPA collects all information
   - DA diagnostic results
   - Complete symptom database
   - All assessment module results
   - Patient context
   ↓
4. TPA generates treatment plan
   - Evidence-based recommendations
   - Medication recommendations (if applicable)
   - Therapy recommendations
   - Lifestyle recommendations
   - Personalized to patient
   ↓
5. TPA stores treatment plan
   ↓
6. Assessment complete
```

### 6. SRA Continuous Processing Workflow

```
For EVERY user response:
   ↓
1. Response sent to SRA service
   ↓
2. SRA extracts symptoms
   - Rule-based extraction
   - LLM-based extraction (if needed)
   ↓
3. SRA extracts attributes
   - Severity (mild, moderate, severe, extreme)
   - Frequency (daily, weekly, etc.)
   - Duration (weeks, months, etc.)
   - Triggers (if mentioned)
   - Impact on daily life
   ↓
4. SRA updates symptom database
   - Adds new symptoms
   - Updates existing symptoms
   - Merges duplicate symptoms
   ↓
5. Symptom database available for DA/TPA
```

---

## Components

### 1. AssessmentModerator

**Location**: `assessment_v2/moderator.py`

**Purpose**: Main orchestrator that manages the entire assessment workflow.

**Key Responsibilities**:
- Module lifecycle management
- Session state management
- Message routing
- Module transitions
- Error recovery
- State persistence

**Key Methods**:
- `start_assessment()`: Initialize new assessment session
- `process_message()`: Process user messages and route to modules
- `get_session_state()`: Retrieve current session state
- `get_session_progress()`: Get assessment progress
- `generate_comprehensive_report()`: Generate final assessment report

### 2. SRA Service (Symptom Recognition and Analysis)

**Location**: `assessment_v2/core/sra_service.py`

**Purpose**: Continuous background service that extracts symptoms from all user responses.

**Key Features**:
- Real-time symptom extraction
- Attribute extraction (severity, frequency, duration, triggers)
- Symptom database updates
- Works silently in background
- No user interaction required

**Key Methods**:
- `extract_symptoms()`: Extract symptoms from text
- `extract_attributes()`: Extract symptom attributes
- `update_symptom_database()`: Update symptom database

### 3. Symptom Database

**Location**: `assessment_v2/core/symptom_database.py`

**Purpose**: Manages symptom storage and retrieval throughout the assessment.

**Key Features**:
- Session-based storage
- Symptom merging
- Attribute tracking
- Summary generation

**Key Methods**:
- `add_symptom()`: Add new symptom
- `update_symptom()`: Update existing symptom
- `get_symptoms()`: Retrieve all symptoms
- `get_symptom_summary()`: Get formatted summary

### 4. Response Processor

**Location**: `assessment_v2/core/response_processor.py`

**Purpose**: Processes user responses and integrates with SRA service.

**Key Features**:
- Integrates SRA service automatically
- Processes every response through SRA
- Handles free text and structured responses
- Updates symptom database

### 5. Diagnostic Analysis (DA) Module

**Location**: `assessment_v2/agents/da/da_module.py`

**Purpose**: Performs comprehensive diagnostic analysis after all modules complete.

**Key Features**:
- Accesses all assessment data
- Uses complete symptom database
- Maps to DSM-5 criteria
- Generates diagnostic report
- Provides confidence scores

**When It Runs**: After ALL diagnostic modules complete

**Dependencies**: All diagnostic modules, SRA symptom database

### 6. Treatment Planning (TPA) Module

**Location**: `assessment_v2/agents/tpa/tpa_module.py`

**Purpose**: Generates personalized treatment plans after DA completes.

**Key Features**:
- Uses DA diagnostic results
- Uses complete symptom database
- Evidence-based recommendations
- Personalized treatment plans
- Medication and therapy recommendations

**When It Runs**: After DA completes

**Dependencies**: DA module, SRA symptom database, all assessment modules

### 7. Module System

**Base Module**: `assessment_v2/modules/base_module.py`

**Module Types**:
- **Basic Info Modules**: Demographics, presenting concern, risk assessment
- **Screening Modules**: SCID screening
- **Diagnostic Modules**: Mood, anxiety, trauma, and other disorders
- **Agent Modules**: DA and TPA

**Module Structure**:
- Each module inherits from `BaseAssessmentModule`
- Implements required methods: `start_session()`, `process_message()`, etc.
- Returns `ModuleResponse` objects
- Tracks module state

### 8. Configuration System

**Location**: `assessment_v2/config.py`

**Key Components**:
- `MODULE_REGISTRY`: Registry of all available modules
- `ASSESSMENT_FLOW`: Default module sequence
- Module dependencies and prerequisites
- Module metadata

**Module Sequence**:
1. Demographics
2. Presenting Concern
3. Risk Assessment
4. SCID Screening
5. Diagnostic Modules (dynamic selection)
6. DA (runs after all modules)
7. TPA (runs after DA)

### 9. Database Management

**Location**: `assessment_v2/database.py`

**Purpose**: Manages persistent storage of assessment data.

**Key Features**:
- Session management
- Conversation history storage
- Module data storage
- Progress tracking
- Results storage

### 10. LLM Integration

**Location**: `assessment_v2/core/llm/`

**Components**:
- `llm_client.py`: Base LLM client wrapper
- `enhanced_llm.py`: Enhanced LLM with confidence scoring
- `react_nodes.py`: ReAct orchestrator nodes

**Usage**:
- Response parsing
- Symptom extraction
- Diagnostic analysis
- Treatment planning

---

## Module System

### Available Modules

#### Basic Information Modules

1. **Demographics** (`modules/basic_info/demographics.py`)
   - Collects patient demographic information
   - Age, gender, education, occupation, background

2. **Presenting Concern** (`modules/basic_info/concern.py`)
   - Collects main reason for seeking help
   - Understanding patient's primary concerns

3. **Risk Assessment** (`modules/basic_info/risk_assessment.py`)
   - Safety evaluation
   - Suicide risk assessment
   - Self-harm assessment

#### Screening Modules

4. **SCID Screening** (`modules/screening/scid_screening.py`)
   - Targeted SCID-5-SC screening
   - Determines which diagnostic modules to deploy

#### Diagnostic Modules

**Mood Disorders**:
- **MDD** (Major Depressive Disorder)
- **Bipolar** (Bipolar I Disorder)

**Anxiety Disorders**:
- **GAD** (Generalized Anxiety Disorder)
- **Panic** (Panic Disorder)
- **Agoraphobia**
- **Social Anxiety** (Social Anxiety Disorder)
- **Specific Phobia**

**Trauma Disorders**:
- **PTSD** (Posttraumatic Stress Disorder)
- **Adjustment** (Adjustment Disorder)

**Other Disorders**:
- **OCD** (Obsessive-Compulsive Disorder)
- **ADHD** (Attention-Deficit/Hyperactivity Disorder)
- **Eating Disorders** (Anorexia Nervosa)
- **Alcohol Use** (Alcohol Use Disorder)
- **Substance Use** (Substance Use Disorder)

#### Agent Modules

- **DA** (Diagnostic Analysis): Runs after all diagnostic modules
- **TPA** (Treatment Planning): Runs after DA

### Module Development

To create a new module:

1. Create module file in appropriate directory
2. Inherit from `BaseAssessmentModule`
3. Implement required methods:
   - `module_name`: Property returning module name
   - `start_session()`: Initialize module session
   - `process_message()`: Process user messages
   - `is_complete()`: Check if module is complete
4. Register module in `config.py`

Example:

```python
from ..base_module import BaseAssessmentModule
from ...types import ModuleResponse

class MyModule(BaseAssessmentModule):
    @property
    def module_name(self) -> str:
        return "my_module"
    
    def start_session(self, user_id: str, session_id: str) -> ModuleResponse:
        return ModuleResponse(
            message="Welcome to my module!",
            is_complete=False,
            requires_input=True
        )
    
    def process_message(self, user_id: str, session_id: str, message: str) -> ModuleResponse:
        # Process message logic
        return ModuleResponse(
            message="Response",
            is_complete=False,
            requires_input=True
        )
```

---

## API Integration

### API Endpoints

**Location**: `app/api/v1/endpoints/assessment.py`

**Base Path**: `/api/v1/assessment`

All endpoints require authentication via JWT token in the Authorization header.

---

#### Core Assessment Endpoints

1. **POST `/assessment/start`**
   - **Description**: Start a new assessment session
   - **Request Body**: 
     ```json
     {
       "session_id": "optional-custom-session-id"
     }
     ```
   - **Response**: 
     ```json
     {
       "session_id": "uuid",
       "greeting": "Initial greeting message",
       "available_modules": ["module1", "module2", ...],
       "metadata": {...}
     }
     ```
   - **Returns**: Greeting message and session metadata

2. **POST `/assessment/chat`**
   - **Description**: Process user message in assessment conversation
   - **Request Body**:
     ```json
     {
       "message": "User message text",
       "session_id": "optional-session-id"
     }
     ```
   - **Response**:
     ```json
     {
       "response": "Assistant response",
       "session_id": "uuid",
       "current_module": "module_name",
       "is_complete": false,
       "progress_percentage": 25.5,
       "metadata": {...}
     }
     ```
   - **Note**: Creates new session if session_id not provided

3. **POST `/assessment/continue`**
   - **Description**: Continue an existing assessment session
   - **Request Body**:
     ```json
     {
       "message": "User message",
       "session_id": "required-session-id"
     }
     ```
   - **Response**: Same as `/chat` endpoint
   - **Note**: Requires existing session_id, validates ownership

---

#### Session Management Endpoints

4. **GET `/assessment/sessions/{session_id}/progress`**
   - **Description**: Get detailed progress information for a session
   - **Response**:
     ```json
     {
       "session_id": "uuid",
       "progress_percentage": 45.0,
       "current_module": "module_name",
       "completed_modules": ["module1", "module2"],
       "total_modules": 10,
       "is_complete": false,
       "started_at": "2025-01-27T10:00:00Z",
       "estimated_completion": null
     }
     ```

5. **GET `/assessment/sessions/{session_id}/results`**
   - **Description**: Get assessment results for a completed session
   - **Response**:
     ```json
     {
       "session_id": "uuid",
       "is_complete": true,
       "results": {
         "progress": {...},
         "module_count": 5,
         "conversation_count": 20
       },
       "module_data": [...],
       "summary": "Assessment summary",
       "recommendations": "Recommendations text"
     }
     ```

6. **GET `/assessment/sessions/{session_id}/history`**
   - **Description**: Get complete conversation history for a session
   - **Response**:
     ```json
     {
       "session_id": "uuid",
       "messages": [
         {
           "id": "msg_1",
           "content": "Message text",
           "role": "user",
           "timestamp": "2025-01-27T10:00:00Z",
           "metadata": {...}
         }
       ],
       "total_messages": 20,
       "session_duration": "0:15:30"
     }
     ```

7. **GET `/assessment/sessions/{session_id}/load`**
   - **Description**: Load a specific session with full conversation history
   - **Response**:
     ```json
     {
       "session_id": "uuid",
       "messages": [...],
       "progress": {...},
       "session_state": {
         "current_module": "module_name",
         "is_complete": false,
         "started_at": "2025-01-27T10:00:00Z",
         "updated_at": "2025-01-27T10:15:00Z"
       }
     }
     ```

8. **POST `/assessment/sessions/save`**
   - **Description**: Save a completed assessment session
   - **Request Body**:
     ```json
     {
       "session_id": "uuid"
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "message": "Session saved successfully",
       "session_summary": {...}
     }
     ```

9. **GET `/assessment/sessions`**
   - **Description**: List all saved assessment sessions for the current user
   - **Query Parameters**: 
     - `page` (optional): Page number (default: 1)
     - `page_size` (optional): Items per page (default: 20, max: 100)
   - **Response**:
     ```json
     {
       "sessions": [...],
       "total_sessions": 5,
       "page": 1,
       "page_size": 20,
       "total_pages": 1
     }
     ```

10. **DELETE `/assessment/sessions/{session_id}`**
    - **Description**: Delete an assessment session
    - **Response**:
      ```json
      {
        "success": true,
        "message": "Session deleted successfully",
        "session_id": "uuid"
      }
      ```

---

#### Advanced Session Endpoints

11. **GET `/assessment/sessions/{session_id}/enhanced-progress`**
    - **Description**: Get enhanced progress with detailed metrics
    - **Response**: Same structure as `/progress` with additional metrics

12. **GET `/assessment/sessions/{session_id}/analytics`**
    - **Description**: Get detailed session analytics for monitoring
    - **Response**: Analytics data including timing, module usage, etc.

13. **POST `/assessment/sessions/{session_id}/switch-module`**
    - **Description**: Switch to a different module in the current session
    - **Request Body**:
      ```json
      {
        "module_name": "target_module_name"
      }
      ```
    - **Response**:
      ```json
      {
        "success": true,
        "message": "Successfully switched to module 'module_name'",
        "session_id": "uuid",
        "current_module": "module_name"
      }
      ```

---

#### Results and Reporting Endpoints

14. **GET `/assessment/sessions/{session_id}/assessment-data`**
    - **Description**: Get complete comprehensive assessment data
    - **Query Parameters**:
      - `format` (optional): Output format - "json" or "export" (default: "json")
    - **Response**: Complete assessment data including:
      - All module results (TPA, DA, SRA outputs)
      - Module data
      - Conversation history
      - Progress information
      - Comprehensive report
      - Export metadata

15. **GET `/assessment/sessions/{session_id}/comprehensive-report`**
    - **Description**: Get comprehensive natural language report
    - **Response**:
      ```json
      {
        "session_id": "uuid",
        "report": "Full narrative report text...",
        "report_length": 5000,
        "generated_at": "2025-01-27T10:20:00Z"
      }
      ```

16. **GET `/assessment/assessment_result/{session_id}`**
    - **Description**: Get complete assessment workflow result (Protected)
    - **Response**: Complete workflow result including:
      - Demographics data
      - SRA (Symptom Recognition) results
      - DA (Diagnostic Analysis) results
      - TPA (Treatment Planning) results
      - Complete workflow summary

---

#### Module Management Endpoints

17. **GET `/assessment/modules`**
    - **Description**: List all available assessment modules
    - **Response**:
      ```json
      {
        "modules": [
          {
            "name": "module_name",
            "version": "1.0.0",
            "description": "Module description",
            "is_active": false
          }
        ],
        "total_count": 15,
        "available": true
      }
      ```

18. **POST `/assessment/modules/{module_name}/deploy`**
    - **Description**: Deploy a specific module for assessment
    - **Request Body**:
      ```json
      {
        "module_name": "module_name",
        "session_id": "optional-session-id",
        "force": false
      }
      ```
    - **Response**:
      ```json
      {
        "success": true,
        "module_name": "module_name",
        "message": "Module deployed successfully",
        "session_id": "uuid"
      }
      ```

---

#### Health and Status

19. **GET `/assessment/health`**
    - **Description**: Health check for assessment system
    - **Response**:
      ```json
      {
        "status": "healthy",
        "assessment_available": true,
        "agents_available": false,
        "modules_count": 15,
        "enhanced_features": {
          "real_time_deployment": true,
          "conversation_storage": true,
          "progress_tracking": true,
          "analytics": true,
          "module_switching": true,
          "comprehensive_report": true,
          "comprehensive_data_storage": true,
          "assessment_data_export": true,
          "agent_integration": false
        },
        "timestamp": 1706352000.0
      }
      ```

---

### Authentication

All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Only patients can access assessment endpoints. Other user types will receive a 403 Forbidden error.

### Error Responses

Standard error responses:

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Access denied (not a patient or session ownership mismatch)
- **404 Not Found**: Session or resource not found
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Assessment system unavailable
- **501 Not Implemented**: Feature not available in this version

### API Usage Example

```python
from app.agents.assessment.assessment_v2.moderator import AssessmentModerator

# Initialize moderator
moderator = AssessmentModerator()

# Start assessment
greeting = moderator.start_assessment(
    user_id="user123",
    session_id="session456"
)

# Process message
response = moderator.process_message(
    user_id="user123",
    session_id="session456",
    message="I'm 25 years old"
)

# Get progress
progress = moderator.get_session_progress("session456")

# Get comprehensive report
report = moderator.generate_comprehensive_report("session456")
```

---

## Development Guide

### Setting Up Development Environment

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Database**:
   - Update database connection in `database.py`
   - Ensure PostgreSQL is running

3. **Configure LLM**:
   - Set LLM API keys in environment variables
   - Configure LLM client in `core/llm/llm_client.py`

### Running Tests

```bash
# Run migration test
python assessment_v2/test_migration.py

# Run specific module tests
pytest tests/assessment/
```

### Adding New Modules

1. Create module file in appropriate directory
2. Implement `BaseAssessmentModule` interface
3. Register in `config.py`
4. Add to module sequence if needed
5. Test module functionality

### Debugging

- Enable debug logging: Set log level to DEBUG
- Check session state: Use `get_session_state()`
- Check symptom database: Use `get_symptom_database()`
- Review module responses: Check `ModuleResponse` objects

---

## Configuration

### Module Registry

Modules are registered in `config.py` with the following structure:

```python
MODULE_REGISTRY = {
    "module_name": ModuleConfig(
        name="module_name",
        class_path="path.to.module.class",
        enabled=True,
        priority=1,
        auto_start=False,
        description="Module description",
        estimated_duration=600,
        dependencies=[],
        metadata={}
    )
}
```

### Assessment Flow

The default assessment flow is defined in `ASSESSMENT_FLOW`:

```python
ASSESSMENT_FLOW = {
    "default_sequence": [
        "demographics",
        "presenting_concern",
        "risk_assessment",
        "scid_screening",
        "scid_cv_diagnostic",
        "da_diagnostic_analysis",
        "tpa_treatment_planning"
    ],
    "background_services": {
        "sra": {
            "enabled": True,
            "runs_throughout": True
        }
    }
}
```

### SRA Configuration

SRA service is automatically initialized and runs in the background. No configuration needed - it processes all responses automatically.

### DA/TPA Configuration

- **DA** runs automatically after all diagnostic modules complete
- **TPA** runs automatically after DA completes
- Both have access to all assessment data and symptom database

---

## Key Design Decisions

### 1. SRA as Continuous Background Service

**Why**: Symptoms are mentioned throughout the assessment, not just at the end.

**How**: Integrated into response processor, processes every response silently.

**Benefits**:
- Real-time symptom tracking
- Complete symptom database
- Better diagnostic accuracy
- No user interaction needed

### 2. DA as Final Analyzer

**Why**: Needs complete data for accurate DSM-5 mapping.

**When**: Runs after ALL diagnostic modules complete.

**What**: Accesses all assessment data, symptom database, module results.

**Benefits**:
- Comprehensive diagnostic analysis
- Optimal DSM-5 mapping
- Better diagnostic accuracy

### 3. TPA as Final Planner

**Why**: Needs complete diagnostic picture for treatment planning.

**When**: Runs after DA completes.

**What**: Uses all information including DA results, symptoms, assessment data.

**Benefits**:
- Personalized treatment plans
- Evidence-based recommendations
- Comprehensive planning

---

## Best Practices

1. **Module Development**:
   - Follow `BaseAssessmentModule` interface
   - Use consistent response formats
   - Handle errors gracefully
   - Log important events

2. **Symptom Extraction**:
   - Let SRA service handle automatically
   - Don't manually extract symptoms in modules
   - Trust symptom database for DA/TPA

3. **Module Transitions**:
   - Let moderator handle transitions
   - Don't manually trigger next modules
   - Use dependencies correctly

4. **Error Handling**:
   - Use try-except blocks
   - Return appropriate error responses
   - Log errors for debugging

5. **Testing**:
   - Test modules individually
   - Test module transitions
   - Test DA/TPA workflows
   - Test SRA symptom extraction

---

## Troubleshooting

### Common Issues

1. **Module not loading**:
   - Check module is registered in `config.py`
   - Verify class path is correct
   - Check module dependencies

2. **SRA not extracting symptoms**:
   - Check SRA service is initialized
   - Verify LLM client is available
   - Check symptom database is accessible

3. **DA/TPA not running**:
   - Verify all diagnostic modules completed
   - Check module dependencies in config
   - Verify DA/TPA are in module sequence

4. **Session state lost**:
   - Check database connection
   - Verify session persistence
   - Check session_id is consistent

---

## Version Information

- **Version**: 2.0.0
- **Status**: Production Ready
- **Last Updated**: 2025-01-27

---

## Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.

---

**Note**: This documentation covers the complete Assessment System V2. All components work together to provide a comprehensive, DSM-5 compliant mental health assessment platform.

