"""Unit and Integration tests for Concept Extractor, Skill Assessment & Knowledge Mesh Graph Builder."""

import pytest
from app.services.mesh.relationship_engine import seed_controlled_skills_and_relationships
from app.services.mesh.concept_extractor import ConceptExtractorService
from app.services.mesh.graph_builder import KnowledgeMeshGraphBuilder


def test_seed_controlled_skills_and_relationships(db_session):
    skill_map = seed_controlled_skills_and_relationships(db_session)
    assert "functions" in skill_map
    assert "recursion" in skill_map
    assert "tree-traversal" in skill_map
    assert skill_map["recursion"].category == "advanced"


def test_concept_extraction_and_graph_builder(db_session):
    # Seed skills
    seed_controlled_skills_and_relationships(db_session)

    # Concept extraction with empty user
    extractor = ConceptExtractorService()
    assessments = extractor.extract_and_assess_user_skills("demo_user_id", db_session)
    assert len(assessments) > 0

    # Build Graph
    builder = KnowledgeMeshGraphBuilder()
    graph = builder.build_graph("demo_user_id", db_session)

    assert "nodes" in graph
    assert "edges" in graph
    assert graph["total_skills"] >= 10

    # Verify edge relationships
    edge_ids = [e["id"] for e in graph["edges"]]
    assert "e-recursion-tree-traversal" in edge_ids
