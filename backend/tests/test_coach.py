"""Unit and Integration tests for CoachContext, AI Provider, and Coach Service."""

import pytest
from app.services.coach.context_builder import CoachContextBuilder
from app.services.coach.provider_base import MockGroundedAIProvider
from app.services.coach.coach_service import CoachService


def test_coach_context_builder(db_session):
    builder = CoachContextBuilder()
    ctx = builder.build_user_context("test_user_id", db_session)
    assert "user_id" in ctx
    assert "connected_platforms" in ctx
    assert "next_best_action" in ctx


def test_mock_grounded_ai_provider():
    provider = MockGroundedAIProvider()
    dummy_ctx = {
        "user_id": "test_user_id",
        "evidence_count": 5,
        "artifact_count": 2,
        "connected_platforms": ["GitHub"],
        "total_evidence_count": 5,
        "external_evidence_count": 3,
        "codelab_artifacts_count": 2,
        "artifacts": [{"id": "a1", "language": "Python", "repository": "mohit/mesh", "file_path": "main.py"}],
        "next_best_action": {"target_skill": "Recursion", "reason": "Weak evidence", "recommended_difficulty": "Easy"},
    }

    res = provider.generate_response(dummy_ctx, "Why am I weak at recursion?")
    assert "answer" in res
    assert "Recursion" in res["answer"]
    assert len(res["suggested_actions"]) > 0


def test_coach_service_message_persistence(db_session):
    service = CoachService()
    res = service.process_user_message(
        user_id="test_user_id",
        message="What should I practice today?",
        db=db_session,
    )
    assert "conversation_id" in res
    assert "answer" in res

    history = service.get_conversation_history(res["conversation_id"], "test_user_id", db_session)
    assert len(history["messages"]) == 2  # user msg + ai msg
