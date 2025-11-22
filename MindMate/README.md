# MindMate

MindMate is a full-stack behavioral health platform composed of a FastAPI backend and a Vite + React frontend. This README provides a single entry point for working with both codebases in the `backend` and `frontend` subdirectories.

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL (or the database defined in `backend/app/core/config.py`)
- Redis (when running background tasks or websocket features)

## Backend Setup

1. Change into the backend directory:
   ```bash
   cd MindMate/backend
   ```
2. (Recommended) Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Apply database migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the API:
   ```bash
   uvicorn app.main:app --reload
   ```

Environment variables are managed via `.env` files—see `backend/README.md` for the exhaustive list of options.

## Frontend Setup

1. Change into the frontend directory:
   ```bash
   cd MindMate/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

Additional build and deployment notes live in `frontend/README.md`.

## Testing

- Backend:
  ```bash
  cd MindMate/backend
  pytest
  ```
- Frontend:
  ```bash
  cd MindMate/frontend
  npm run test
  ```

## Repository Structure

```
MindMate/
├── backend/   # FastAPI application, services, and integrations
├── frontend/  # React application served via Vite
└── README.md  # Project-wide overview (this file)
```

Refer to the dedicated READMEs in each subdirectory for feature-level documentation, API references, and architecture diagrams.

