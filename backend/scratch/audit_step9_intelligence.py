import sys
import os

# Ensure app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.user import User
from app.models.platform import PlatformConnection
from app.models.evidence import Evidence
from app.models.skill import Skill, SkillAssessment, SkillRelationship
from app.services.mesh.concept_extractor import ConceptExtractorService
from app.services.mesh.unified_profile import UnifiedProfileService
from app.services.recommendations.problem_matcher import ProblemMatcherService, CONTROLLED_PRACTICE_PROBLEMS
from app.services.recommendations.learning_path_generator import LearningPathGenerator

def run_audit():
    db = SessionLocal()
    try:
        print("==================================================")
        print("STEP 9 — LEARNING PATH INTELLIGENCE AUDIT")
        print("==================================================")

        test_clerk_id = "clerk_codechef_e2e_test"
        user = db.query(User).filter(User.clerk_user_id == test_clerk_id).first()
        if not user:
            print("User not found!")
            return

        print(f"User ID: {user.id}")

        # 1. AUDIT SOLVED PROBLEMS vs CONTROLLED PROBLEMS
        ev_records = db.query(Evidence).filter(
            Evidence.user_id == user.id,
            Evidence.evidence_type == "problem_submission"
        ).all()

        solved_codes = set()
        for ev in ev_records:
            payload = ev.normalized_payload or {}
            code = payload.get("problem_code")
            if code:
                solved_codes.add(code.upper())

        print(f"\nUser's Total External Solved Problem Codes: {len(solved_codes)}")
        
        # Check if FLOW001 or ATM or any controlled problems are in user's solved_codes
        controlled_cc = [p for p in CONTROLLED_PRACTICE_PROBLEMS if p["platform"] == "CodeChef"]
        print("\nControlled CodeChef Problems:")
        for p in controlled_cc:
            code = p["external_id"].replace("cc_", "").upper()
            is_solved_externally = code in solved_codes or p["title"].split("(")[-1].replace(")", "").upper() in solved_codes
            print(f" - Title: '{p['title']}', External ID: '{p['external_id']}', Code: '{code}', Already Solved on CodeChef? {is_solved_externally}")

        # 2. AUDIT PROBLEM MATCHER FILTERING
        matcher = ProblemMatcherService()
        recs = matcher.get_ranked_recommendations(user.id, "functions", db)
        print("\nRecommendations Output for target skill 'functions':")
        for idx, r in enumerate(recs, start=1):
            code_extracted = r["url"].split("/")[-1].upper()
            is_in_evidence = code_extracted in solved_codes
            print(f" [{idx}] Platform: {r['platform']}, Title: '{r['title']}', URL: {r['url']}")
            print(f"      Is in External Solved Evidence? {is_in_evidence}")

        # 3. AUDIT SKILL ASSESSMENT & MASTERY CALCULATION
        extractor = ConceptExtractorService()
        assessments = extractor.extract_and_assess_user_skills(user.id, db)
        print("\nSkill Assessments & Mastery Values:")
        for a in assessments:
            if a.skill:
                print(f" - Skill: '{a.skill.name}' ({a.skill.slug}): Mastery={a.mastery_score}%, Status={a.status}, Evidence Count={a.evidence_count}")

        # 4. AUDIT LEARNING PATH ROADMAP SELECTION
        lp_gen = LearningPathGenerator()
        roadmap = lp_gen.generate_roadmap(user.id, db)
        print(f"\nLearning Path Target Goal: '{roadmap['target_goal']}'")
        print(f"Learning Path Steps Count: {roadmap['total_steps']}")
        print(f"Current Focus Skill: '{roadmap['current_focus_skill']}'")
        for s in roadmap["steps"]:
            print(f" - Step [{s['step_number']}]: '{s['title']}' ({s['slug']}) | Status: {s['status']} | Mastery: {s['mastery']}% | Why: '{s['why']}'")

        # 5. AUDIT RECOMMENDATION RANKING CRITERIA IN PROBLEM MATCHER
        print("\n==================================================")
        print("RANKING & PERSONALIZATION ANALYSIS")
        print("==================================================")
        print("Sorting logic in ProblemMatcherService:")
        print("  recommendations.sort(key=lambda r: 0 if r['platform'] in user_platforms else 1)")
        print("Observations:")
        print(" 1. Platform Sorting: Binary preference (0 if connected, 1 if unconnected).")
        print(" 2. Skill Relevance: Binary filter (target_skill_slug in skills_list or 'all').")
        print(" 3. Difficulty Sorting: NOT sorted by difficulty (Preserved insertion order from CONTROLLED_PRACTICE_PROBLEMS array).")
        print(" 4. Deduplication: Controlled list has unique external_ids, but no deduplication against Evidence.")
        print(" 5. Solved Problem Exclusion: Only filters against `CodeAttempt` (CodeLab IDE attempts), completely ignores `Evidence` table solved problems from external platforms.")

    finally:
        db.close()

if __name__ == "__main__":
    run_audit()
