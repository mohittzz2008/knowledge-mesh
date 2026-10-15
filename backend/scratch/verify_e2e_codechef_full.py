import sys
import os
import time
import asyncio
from datetime import datetime, timezone

# Ensure app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, engine
from app.models.user import User, DeveloperProfile
from app.models.platform import PlatformConnection
from app.models.evidence import Evidence
from app.services.platform.registry import PlatformRegistry
from app.services.platform.codechef import CodeChefConnector
from app.services.mesh.concept_extractor import ConceptExtractorService
from app.services.mesh.unified_profile import UnifiedProfileService
from app.services.recommendations.problem_matcher import ProblemMatcherService
from app.services.recommendations.learning_path_generator import LearningPathGenerator

def run_e2e_verification():
    db = SessionLocal()
    try:
        print("==================================================")
        print("1. PLATFORM CONNECTION API & REGISTRY VERIFICATION")
        print("==================================================")
        registry_items = PlatformRegistry.list_items()
        codechef_item = next((i for i in registry_items if i.key == "codechef"), None)
        assert codechef_item is not None, "CodeChef missing from registry"
        print(f"CodeChef registered in PlatformRegistry: key={codechef_item.key}, name={codechef_item.name}")
        
        connector = PlatformRegistry.get_connector_instance("codechef")
        assert isinstance(connector, CodeChefConnector), "Connector instance is not CodeChefConnector"
        print(f"Instantiated connector: {connector.platform_name}")

        print("\n==================================================")
        print("2. REAL CODECHEF CONNECTION & DATA SYNC")
        print("==================================================")
        test_clerk_id = "clerk_codechef_e2e_test"
        user = db.query(User).filter(User.clerk_user_id == test_clerk_id).first()
        if not user:
            user = User(
                clerk_user_id=test_clerk_id,
                email="codechef_e2e_user@example.com",
                full_name="CodeChef E2E Test User",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Clear previous test connections/evidence for clean test
        db.query(Evidence).filter(Evidence.user_id == user.id).delete()
        db.query(PlatformConnection).filter(PlatformConnection.user_id == user.id).delete()
        db.commit()

        username = "tourist"

        print("Pausing 15 seconds to clear any CDN rate limit counters...")
        time.sleep(15)

        raw_evidence = []
        for attempt in range(1, 5):
            print(f"Attempt {attempt}: Single-pass evidence fetch for '{username}'...")
            raw_evidence = asyncio.run(connector.fetch_evidence(username))
            if raw_evidence:
                print(f"Successfully fetched {len(raw_evidence)} evidence items on attempt {attempt}")
                break
            print("Received rate-limit (429) from CodeChef CDN. Waiting 12 seconds for cooldown...")
            time.sleep(12)

        assert len(raw_evidence) > 0, "fetch_evidence returned empty list!"

        # Create connection
        conn = PlatformConnection(
            user_id=user.id,
            platform=connector.platform_name,
            auth_type="username_public",
            username=username,
            connected=True,
        )
        db.add(conn)
        db.commit()
        db.refresh(conn)
        print(f"Created PlatformConnection ID: {conn.id}, platform: {conn.platform}, username: {conn.username}")

        synced_count = 0
        for item in raw_evidence:
            norm = connector.normalize_evidence(item)
            ev = Evidence(
                user_id=user.id,
                platform_connection_id=conn.id,
                external_id=norm.get("external_id"),
                title=norm.get("title"),
                evidence_type=norm.get("evidence_type"),
                raw_payload=norm.get("raw_payload"),
                normalized_payload=norm.get("normalized_payload"),
                occurred_at=datetime.now(timezone.utc),
            )
            db.add(ev)
            synced_count += 1

        db.commit()
        print(f"Persisted {synced_count} evidence records into database")

        print("\n==================================================")
        print("3. DATABASE VERIFICATION")
        print("==================================================")
        db_conn = db.query(PlatformConnection).filter(
            PlatformConnection.user_id == user.id,
            PlatformConnection.platform == "CodeChef"
        ).first()
        assert db_conn is not None and db_conn.connected is True
        print(f"Database PlatformConnection verified: id={db_conn.id}, connected={db_conn.connected}")

        ev_records = db.query(Evidence).filter(Evidence.user_id == user.id).all()
        print(f"Total Database Evidence records: {len(ev_records)}")

        stats_ev = [e for e in ev_records if e.evidence_type == "problem_solving_summary"]
        badge_ev = [e for e in ev_records if e.evidence_type == "badge"]
        solved_ev = [e for e in ev_records if e.evidence_type == "problem_submission"]

        print(f"  - Summary Evidence: {len(stats_ev)}")
        print(f"  - Badge Evidence: {len(badge_ev)}")
        print(f"  - Solved Problem Evidence: {len(solved_ev)}")
        assert len(solved_ev) == 589, f"Expected 589 solved problem evidence items, got {len(solved_ev)}"

        sample_solved = solved_ev[0]
        code_in_norm = sample_solved.normalized_payload.get("problem_code")
        expected_url = f"https://www.codechef.com/problems/{code_in_norm}"
        print(f"Sample Solved Evidence: title='{sample_solved.title}', code='{code_in_norm}', url='{expected_url}'")
        assert sample_solved.platform_connection_id == db_conn.id

        print("\n==================================================")
        print("4. KNOWLEDGE MESH VERIFICATION")
        print("==================================================")
        extractor = ConceptExtractorService()
        assessments = extractor.extract_and_assess_user_skills(user.id, db)
        print(f"Assessed user skills count: {len(assessments)}")

        prof_svc = UnifiedProfileService()
        unified = prof_svc.get_unified_profile(user.id, db)
        print(f"Unified Profile platform_counts: {unified.get('platform_counts')}")
        assert "CodeChef" in unified.get("platform_counts")
        assert unified["platform_counts"]["CodeChef"] == len(ev_records)

        print("\n==================================================")
        print("5. DASHBOARD DATA VERIFICATION")
        print("==================================================")
        active_conns = db.query(PlatformConnection).filter(
            PlatformConnection.user_id == user.id,
            PlatformConnection.connected == True
        ).all()
        conn_platforms = [c.platform for c in active_conns]
        print(f"User Connected Platforms: {conn_platforms}")
        assert "CodeChef" in conn_platforms

        print("\n==================================================")
        print("6. LEARNING PATH & RECOMMENDATIONS VERIFICATION")
        print("==================================================")
        matcher = ProblemMatcherService()
        matcher.seed_problems(db)

        recs = matcher.get_ranked_recommendations(user.id, "functions", db)
        print(f"Ranked Recommendations for 'functions' ({len(recs)} total):")
        cc_recs = [r for r in recs if r["platform"] == "CodeChef"]
        print(f"  CodeChef recommendations count: {len(cc_recs)}")
        for r in cc_recs:
            print(f"    - Title: '{r['title']}', URL: '{r['url']}', Source: '{r['source']}'")
            assert "https://www.codechef.com/problems/" in r["url"]
            assert r["url"] != "https://www.codechef.com"

        assert len(cc_recs) > 0, "No CodeChef recommendations generated!"

        lp_gen = LearningPathGenerator()
        lp = lp_gen.generate_roadmap(user.id, db)
        print(f"\nGenerated Learning Path target_goal: '{lp['target_goal']}'")
        print(f"Learning Path steps count: {len(lp['steps'])}")
        for s in lp['steps']:
            print(f"  Step: '{s['title']}', Status: {s['status']}, Mastery: {s['mastery']}%")

        print("\n==================================================")
        print("VERIFICATION SUCCESSFUL: ALL END-TO-END CHECKS PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_verification()
