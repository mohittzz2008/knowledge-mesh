import sys
import os
import uuid

# Ensure app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.user import User
from app.models.platform import PlatformConnection
from app.models.skill import Skill, SkillAssessment
from app.models.problem import Problem
from app.services.mesh.relationship_engine import seed_controlled_skills_and_relationships
from app.services.recommendations.problem_matcher import ProblemMatcherService
from app.services.recommendations.next_best_action import NextBestActionService

def run_experiment():
    db = SessionLocal()
    try:
        print("==================================================")
        print("STEP 11 — ADAPTIVE DIFFICULTY EXPERIMENT")
        print("==================================================")
        
        skills_map = seed_controlled_skills_and_relationships(db)
        target_skill = skills_map.get("problem-solving") or skills_map.get("functions")
        assert target_skill is not None

        # Create 3 Users with distinct mastery levels for the same skill
        user_a = User(clerk_user_id=f"clerk_user_a_{uuid.uuid4().hex[:6]}", email="user_a@example.com") # 10% Mastery
        user_b = User(clerk_user_id=f"clerk_user_b_{uuid.uuid4().hex[:6]}", email="user_b@example.com") # 50% Mastery
        user_c = User(clerk_user_id=f"clerk_user_c_{uuid.uuid4().hex[:6]}", email="user_c@example.com") # 85% Mastery

        db.add_all([user_a, user_b, user_c])
        db.commit()

        # Connect CodeChef for all 3 users to eliminate platform bias
        for u in [user_a, user_b, user_c]:
            conn = PlatformConnection(user_id=u.id, platform="CodeChef", username=f"cc_{u.id[:8]}", connected=True)
            db.add(conn)
        db.commit()

        # Create SkillAssessments
        ass_a = SkillAssessment(user_id=user_a.id, skill_id=target_skill.id, mastery_score=10.0, status="weak", evidence_count=1)
        ass_b = SkillAssessment(user_id=user_b.id, skill_id=target_skill.id, mastery_score=50.0, status="developing", evidence_count=5)
        ass_c = SkillAssessment(user_id=user_c.id, skill_id=target_skill.id, mastery_score=85.0, status="mastered", evidence_count=20)
        db.add_all([ass_a, ass_b, ass_c])
        db.commit()

        print(f"Target Skill: '{target_skill.name}' (slug: '{target_skill.slug}')")
        print(f"User A: Mastery = {ass_a.mastery_score}%, Status = '{ass_a.status}'")
        print(f"User B: Mastery = {ass_b.mastery_score}%, Status = '{ass_b.status}'")
        print(f"User C: Mastery = {ass_c.mastery_score}%, Status = '{ass_c.status}'")

        matcher = ProblemMatcherService()

        # Fetch recommendations for all 3 users
        recs_a = matcher.get_ranked_recommendations(user_a.id, target_skill.slug, db)
        recs_b = matcher.get_ranked_recommendations(user_b.id, target_skill.slug, db)
        recs_c = matcher.get_ranked_recommendations(user_c.id, target_skill.slug, db)

        print("\n--- RECOMMENDATION OUTPUTS ---")
        print("\nUser A (10% Mastery - Weak):")
        for r in recs_a:
            print(f"  - [{r['platform']}] {r['title']} (Difficulty: {r['difficulty']})")

        print("\nUser B (50% Mastery - Developing):")
        for r in recs_b:
            print(f"  - [{r['platform']}] {r['title']} (Difficulty: {r['difficulty']})")

        print("\nUser C (85% Mastery - Mastered):")
        for r in recs_c:
            print(f"  - [{r['platform']}] {r['title']} (Difficulty: {r['difficulty']})")

        # Compare recommendation lists
        same_a_b = [r["problem_id"] for r in recs_a] == [r["problem_id"] for r in recs_b]
        same_b_c = [r["problem_id"] for r in recs_b] == [r["problem_id"] for r in recs_c]

        print("\n--- EXPERIMENT COMPARISON RESULT ---")
        print(f"Are User A (10%) and User B (50%) recommendations identical? {same_a_b}")
        print(f"Are User B (50%) and User C (85%) recommendations identical? {same_b_c}")

    finally:
        db.close()

if __name__ == "__main__":
    run_experiment()
