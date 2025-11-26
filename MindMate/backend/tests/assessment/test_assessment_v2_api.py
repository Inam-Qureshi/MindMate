"""
API-level tests for the Assessment v2 workflow.

These tests focus on the FastAPI router defined in
`app.api.v1.endpoints.assessment_v2`. The real workflow depends on
multiple infrastructure components (database, LLMs, LangGraph agent, SRA
monitor, etc.). To keep the tests hermetic and fast, we replace those
dependencies with lightweight fakes so we can exercise the full HTTP
flow:

1. Start an assessment session
2. Exchange chat messages until completion
3. Fetch state, resume, and end the session
4. Verify health endpoint

By mocking the assessment agent and initial info helpers we can verify
the API contract without requiring databases or network calls.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, Tuple

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import assessment
from app.agents.Assessment.v2.langgraph_agent.state import (
    AssessmentModule,
    AssessmentState,
    AssessmentStatus,
)


class FakePatient:
    """Minimal patient object used by dependency overrides."""

    def __init__(self, user_id: str = "patient-123"):
        self.id = user_id
        self.full_name = "Test Patient"
        self.gender = "female"


class FakeAssessmentAgent:
    """Simple stateful agent used to simulate LangGraph behaviour."""

    def __init__(self, turns_until_complete: int = 2):
        self._sessions: Dict[str, AssessmentState] = {}
        self.turns_until_complete = turns_until_complete

    def get_agent_stats(self) -> Dict[str, Any]:
        return {
            "agent_type": "fake_test_agent",
            "nodes": ["start", "chat", "state"],
        }

    async def start_assessment(self, session_id: str, user_id: str, initial_data: Dict[str, Any] | None = None) -> AssessmentState:
        state = AssessmentState(
            session_id=session_id,
            user_id=user_id,
            current_module=AssessmentModule.CONCERN,
            status=AssessmentStatus.ACTIVE,
        )
        state.initial_info = (initial_data or {}).get("initial_info", {"full_name": "Test Patient"})
        state.updated_at = state.last_updated
        self._sessions[session_id] = state
        return state

    async def process_response(self, session_id: str, user_response: str) -> Dict[str, Any]:
        state = self._sessions[session_id]

        if not user_response.strip():
            content = "To begin, could you share what brought you in today?"
            response_type = "question"
        else:
            state.question_count += 1
            if state.question_count >= self.turns_until_complete:
                state.assessment_complete = True
                state.current_module = AssessmentModule.TPA
                state.completed_modules = [
                    AssessmentModule.CONCERN.value,
                    AssessmentModule.SCID_SC.value,
                    AssessmentModule.SCID_CV.value,
                    AssessmentModule.DA.value,
                    AssessmentModule.TPA.value,
                ]
                state.diagnostic_summary = {"primary_diagnosis": {"name": "Adjustment Disorder"}}
                state.treatment_plan = {"primary_focus": "Develop coping strategies"}
                content = "Thanks for sharing. I've generated your diagnostic summary and treatment plan."
                response_type = "complete"
            else:
                if AssessmentModule.CONCERN.value not in state.completed_modules:
                    state.completed_modules.append(AssessmentModule.CONCERN.value)
                content = f"Thanks for letting me know. Could you elaborate a bit more? (turn {state.question_count})"
                response_type = "question"

        metadata = {
            "question_id": f"q_{state.question_count or 'intro'}",
            "module": state.current_module.value,
        }

        state.update_timestamp()
        state.updated_at = state.last_updated

        return {
            "session_id": session_id,
            "assessment_complete": state.assessment_complete,
            "current_module": state.current_module.value,
            "progress_percentage": state.calculate_progress_percentage(),
            "risk_level": "low",
            "empathy_score": 0.85,
            "question_count": state.question_count,
            "response_type": response_type,
            "content": content,
            "question_metadata": metadata,
            "context_hints": [],
        }

    async def get_current_state(self, session_id: str) -> AssessmentState | None:
        return self._sessions.get(session_id)

    async def resume_assessment(self, session_id: str) -> AssessmentState | None:
        return self._sessions.get(session_id)

    async def end_assessment(self, session_id: str, reason: str = "completed") -> bool:
        state = self._sessions.get(session_id)
        if not state:
            return False
        state.assessment_complete = True
        state.status = AssessmentStatus.COMPLETED
        return True


@pytest.fixture()
def api_client(monkeypatch: pytest.MonkeyPatch) -> Tuple[TestClient, FakeAssessmentAgent]:
    """
    Build a FastAPI TestClient with dependency overrides and fake agent.
    """

    fake_agent = FakeAssessmentAgent()
    monkeypatch.setattr(assessment_v2, "get_assessment_agent", lambda: fake_agent)
    monkeypatch.setattr(assessment_v2, "is_assessment_v2_available", lambda: True)

    app = FastAPI()
    app.include_router(assessment_v2.router)

    async def _override_patient() -> FakePatient:
        return FakePatient()

    async def _override_db():
        class _DummyDB:
            """Placeholder object for DB dependency that is never used."""

        yield _DummyDB()

    app.dependency_overrides[assessment_v2.get_current_patient] = _override_patient
    app.dependency_overrides[assessment_v2.get_db] = _override_db

    return TestClient(app), fake_agent


def test_start_requires_initial_info(api_client, monkeypatch: pytest.MonkeyPatch):
    client, _ = api_client

    def _fake_ensure_info(db, patient, initial_info_id=None):
        return ({"age": None}, ["age"], None)

    monkeypatch.setattr(assessment_v2, "_ensure_initial_info", _fake_ensure_info)

    response = client.post("/assessment-v2/start", json={})
    assert response.status_code == 200
    payload = response.json()
    assert payload["requires_initial_info"] is True
    assert "age" in payload["missing_fields"]


def test_complete_assessment_workflow(api_client, monkeypatch: pytest.MonkeyPatch):
    client, fake_agent = api_client

    def _fake_ensure_info(db, patient, initial_info_id=None):
        return (
            {"full_name": "Test Patient", "age": 30, "city": "Austin"},
            [],
            f"info-{uuid.uuid4()}",
        )

    monkeypatch.setattr(assessment_v2, "_ensure_initial_info", _fake_ensure_info)

    # 1. Start assessment
    start_resp = client.post("/assessment-v2/start", json={})
    assert start_resp.status_code == 200
    start_data = start_resp.json()
    session_id = start_data["session_id"]
    assert start_data["status"] == AssessmentStatus.ACTIVE.value
    assert start_data["current_module"] == AssessmentModule.CONCERN.value

    # 2. First chat turn (ask follow-up question)
    chat_payload = {"session_id": session_id, "user_response": "I've been anxious lately."}
    chat_resp = client.post("/assessment-v2/chat", json=chat_payload)
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["response_type"] == "question"
    assert chat_data["assessment_complete"] is False

    # 3. Second chat turn completes mock workflow
    chat_payload["user_response"] = "It's affecting my sleep as well."
    completion_resp = client.post("/assessment-v2/chat", json=chat_payload)
    assert completion_resp.status_code == 200
    completion_data = completion_resp.json()
    assert completion_data["response_type"] == "complete"
    assert completion_data["assessment_complete"] is True
    assert completion_data["current_module"] == AssessmentModule.TPA.value

    # 4. Retrieve state
    state_resp = client.get(f"/assessment-v2/state/{session_id}")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["assessment_complete"] is True
    assert state_data["current_module"] == AssessmentModule.TPA.value

    # 5. Resume endpoint should still return current snapshot
    resume_resp = client.post(f"/assessment-v2/resume/{session_id}")
    assert resume_resp.status_code == 200
    resume_data = resume_resp.json()
    assert resume_data["session_id"] == session_id
    assert resume_data["current_module"] == AssessmentModule.TPA.value

    # 6. Mark assessment as ended
    end_resp = client.post(f"/assessment-v2/end/{session_id}", json={"reason": "test"})
    assert end_resp.status_code == 200
    assert end_resp.json()["success"] is True

    # Ensure fake agent updated status to completed
    assert fake_agent._sessions[session_id].status == AssessmentStatus.COMPLETED

    # 7. Health endpoint reflects availability
    health_resp = client.get("/assessment-v2/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"

