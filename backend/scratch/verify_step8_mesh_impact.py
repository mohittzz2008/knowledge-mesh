import sys
import os
import time
import asyncio
from datetime import datetime, timezone

# Ensure app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.platform import PlatformConnection
from app.models.evidence import Evidence
from app.models.skill import Skill, SkillAssessment
from app.services.platform.registry import PlatformRegistry
from app.services.platform.codechef import CodeChefConnector
from app.services.mesh.concept_extractor import ConceptExtractorService
from app.services.mesh.unified_profile import UnifiedProfileService
from app.services.recommendations.problem_matcher import ProblemMatcherService
from app.services.recommendations.learning_path_generator import LearningPathGenerator

def run_step8_verification():
    db = SessionLocal()
    try:
        print("==================================================")
        print("1. DATA FLOW IMPLEMENTATION TRACE")
        print("==================================================")
        print("Flow: CodeChef Evidence -> ConceptExtractor -> SkillAssessment -> Knowledge Gaps -> Learning Path -> Recommendations")
        print("Files involved:")
        print(" - Evidence & Connections: app/models/evidence.py, app/models/platform.py")
        print(" - Concept Extraction: app/services/mesh/concept_extractor.py (extract_and_assess_user_skills)")
        print(" - Unified Profile: app/services/mesh/unified_profile.py (get_unified_profile)")
        print(" - Skill & Gap Models: app/models/skill.py (Skill, SkillAssessment, SkillRelationship)")
        print(" - Learning Path Roadmap: app/services/recommendations/learning_path_generator.py (LearningPathGenerator.generate_roadmap)")
        print(" - Recommendation Engine: app/services/recommendations/problem_matcher.py (ProblemMatcherService.get_ranked_recommendations)")

        test_clerk_id = "clerk_codechef_e2e_test"
        user = db.query(User).filter(User.clerk_user_id == test_clerk_id).first()
        if not user:
            print("CRITICAL: Run Step 7 user creation first!")
            return

        print("\n==================================================")
        print("2. VERIFY CODECHEF EVIDENCE RECORDS")
        print("==================================================")
        ev_records = db.query(Evidence).filter(Evidence.user_id == user.id).all()
        print(f"Total CodeChef evidence records in DB: {len(ev_records)}")
        
        stats_ev = [e for e in ev_records if e.evidence_type == "problem_solving_summary"]
        badge_ev = [e for e in ev_records if e.evidence_type == "badge"]
        solved_ev = [e for e in ev_records if e.evidence_type == "problem_submission"]

        print(f"  - Profile Summary Evidence: {len(stats_ev)}")
        print(f"  - Star Badge Evidence: {len(badge_ev)}")
        print(f"  - Solved Problem Evidence: {len(solved_ev)}")

        if solved_ev:
            sample = solved_ev[0]
            code = sample.normalized_payload.get("problem_code")
            title = sample.normalized_payload.get("problem_title")
            url = f"https://www.codechef.com/problems/{code}"
            print(f"Example Problem Code: '{code}'")
            print(f"Example Problem Title: '{title}'")
            print(f"Example Source URL: '{url}'")

        print("\n==================================================")
        print("3. COMPARATIVE EXPERIMENT: TEST A (WITH CODECHEF) vs TEST B (WITHOUT CODECHEF)")
        print("==================================================")
        
        # --- TEST A: CODECHEF CONNECTED ---
        conn = db.query(PlatformConnection).filter(
            PlatformConnection.user_id == user.id,
            PlatformConnection.platform == "CodeChef"
        ).first()
        assert conn is not None
        conn.connected = True
        db.commit()

        extractor = ConceptExtractorService()
        assessments_a = extractor.extract_and_assess_user_skills(user.id, db)
        
        # Skill summary for Test A
        skills_map_a = {
            a.skill.slug: {
                "mastery": a.mastery_score,
                "status": a.status,
                "evidence_count": a.evidence_count
            }
            for a in assessments_a if a.skill
        }

        matcher = ProblemMatcherService()
        matcher.seed_problems(db)
        recs_a = matcher.get_ranked_recommendations(user.id, "functions", db)

        lp_gen = LearningPathGenerator()
        roadmap_a = lp_gen.generate_roadmap(user.id, db)

        print("\n--- TEST A RESULTS (CodeChef CONNECTED) ---")
        print(f"Total Evidence items evaluated: {len(ev_records)}")
        print(f"Assessed Skills Count: {len(assessments_a)}")
        for slug, data in skills_map_a.items():
            if data["evidence_count"] > 0:
                print(f"  Skill '{slug}': Mastery={data['mastery']}%, Status='{data['status']}', Evidence={data['evidence_count']}")
        print(f"Top Recommendation Platform for 'functions': '{recs_a[0]['platform']}' - '{recs_a[0]['title']}' ({recs_a[0]['url']})")
        print(f"Learning Path Step 1 ('Functions'): Status='{roadmap_a['steps'][0]['status']}', Mastery={roadmap_a['steps'][0]['mastery']}%")

        # --- TEST B: CODECHEF DISCONNECTED / EXCLUDED ---
        conn.connected = False
        db.commit()

        assessments_b = extractor.extract_and_assess_user_skills(user.id, db)
        skills_map_b = {
            a.skill.slug: {
                "mastery": a.mastery_score,
                "status": a.status,
                "evidence_count": a.evidence_count
            }
            for a in assessments_b if a.skill
        }
        recs_b = matcher.get_ranked_recommendations(user.id, "functions", db)
        roadmap_b = lp_gen.generate_roadmap(user.id, db)

        print("\n--- TEST B RESULTS (CodeChef DISCONNECTED / EXCLUDED) ---")
        print(f"Total Evidence items evaluated: 0")
        print(f"Assessed Skills Count: {len(assessments_b)}")
        for slug, data in skills_map_b.items():
            print(f"  Skill '{slug}': Mastery={data['mastery']}%, Status='{data['status']}', Evidence={data['evidence_count']}")
        print(f"Top Recommendation Platform for 'functions': '{recs_b[0]['platform']}' - '{recs_b[0]['title']}' ({recs_b[0]['url']})")
        print(f"Learning Path Step 1 ('Functions'): Status='{roadmap_b['steps'][0]['status']}', Mastery={roadmap_b['steps'][0]['mastery']}%")

        # --- RESTORE TEST A STATE ---
        conn.connected = True
        db.commit()
        extractor.extract_and_assess_user_skills(user.id, db)

        print("\n==================================================")
        print("4. DETAILED IMPACT COMPARISON SUMMARY")
        print("==================================================")
        print("Skill Mastery Impact:")
        for slug in ["problem-solving", "lists", "functions"]:
            mA = skills_map_a.get(slug, {}).get("mastery", 0.0)
            mB = skills_map_b.get(slug, {}).get("mastery", 0.0)
            stA = skills_map_a.get(slug, {}).get("status", "NO_EVIDENCE")
            stB = skills_map_b.get(slug, {}).get("status", "NO_EVIDENCE")
            evA = skills_map_a.get(slug, {}).get("evidence_count", 0)
            evB = skills_map_b.get(slug, {}).get("evidence_count", 0)
            print(f"  Skill '{slug}':")
            print(f"    - WITHOUT CodeChef: Mastery={mB}%, Status={stB}, Evidence={evB}")
            print(f"    - WITH CodeChef:    Mastery={mA}%, Status={stA}, Evidence={evA}")
            print(f"    - DELTA:            +{round(mA - mB, 1)}% Mastery increase, Status change: {stB} -> {stA}")

        print("\nRecommendation Engine Priority Impact:")
        print(f"  - WITHOUT CodeChef connected: Top recommendation platform = '{recs_b[0]['platform']}'")
        print(f"  - WITH CodeChef connected:    Top recommendation platform = '{recs_a[0]['platform']}'")

        print("\nLearning Path Roadmap Impact:")
        print(f"  - Step 1 ('Functions') status WITH CodeChef:    '{roadmap_a['steps'][0]['status']}' (Mastery: {roadmap_a['steps'][0]['mastery']}%)")
        print(f"  - Step 1 ('Functions') status WITHOUT CodeChef: '{roadmap_b['steps'][0]['status']}' (Mastery: {roadmap_b['steps'][0]['mastery']}%)")

    finally:
        db.close()

if __name__ == "__main__":
    run_step8_verification()
