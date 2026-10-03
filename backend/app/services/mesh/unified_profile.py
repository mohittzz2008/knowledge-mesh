"""Unified Developer Profile & Cross-Platform Evidence Aggregation Service."""

from typing import Any
from sqlalchemy.orm import Session

from app.models.user import User, DeveloperProfile
from app.models.platform import PlatformConnection
from app.models.evidence import Evidence
from app.models.code_artifact import CodeArtifact
from app.models.skill import SkillAssessment, Skill
from app.services.recommendations.next_best_action import NextBestActionService


class UnifiedProfileService:
    """Aggregates cross-platform telemetry (GitHub, LeetCode, HackerRank, CodeLab) into a single developer intelligence profile."""

    def get_unified_profile(self, user_id: str, db: Session) -> dict[str, Any]:
        user = db.query(User).filter(User.id == user_id).first()
        user_name = (user.full_name or user.email or "Developer") if user else "Developer"

        # 1. Fetch Platform Connections
        connections = db.query(PlatformConnection).filter(PlatformConnection.user_id == user_id).all()
        conn_dict = {c.platform: c for c in connections}

        platforms_summary = []
        for plt_name in ["GitHub", "LeetCode", "HackerRank", "CodeChef"]:
            c = conn_dict.get(plt_name)
            platforms_summary.append({
                "platform": plt_name,
                "connected": c.connected if c else False,
                "username": c.username if c else None,
                "last_synced_at": c.last_synced_at.isoformat() if c and c.last_synced_at else None,
            })

        # 2. Fetch Evidence & Deduplicate
        evidence_items = (
            db.query(Evidence)
            .join(PlatformConnection, Evidence.platform_connection_id == PlatformConnection.id)
            .filter(Evidence.user_id == user_id, PlatformConnection.connected == True)
            .all()
        )
        
        seen_ids = set()
        deduped_evidence = []
        platform_counts = {"GitHub": 0, "LeetCode": 0, "HackerRank": 0, "CodeChef": 0, "CodeLab": 0}

        for ev in evidence_items:
            ext_id = ev.external_id or ev.id
            if ext_id in seen_ids:
                continue
            seen_ids.add(ext_id)
            deduped_evidence.append(ev)

            plt = ev.platform_connection.platform if ev.platform_connection else "CodeLab"
            if plt == "GitHub" and ev.evidence_type != "repository":
                # Do not count activity events towards the top-level GitHub count, 
                # as the frontend expects this to represent the repository count.
                pass
            elif plt in platform_counts:
                platform_counts[plt] += 1
            else:
                platform_counts["CodeLab"] += 1

        # 3. Fetch Code Artifacts Count & CodeLab Practice Artifacts
        artifacts_count = db.query(CodeArtifact).filter(CodeArtifact.user_id == user_id).count()
        codelab_artifacts_count = db.query(CodeArtifact).filter(
            CodeArtifact.user_id == user_id,
            CodeArtifact.platform == "CodeLab"
        ).count()

        platform_counts["CodeLab"] = codelab_artifacts_count
        external_ev_count = len(deduped_evidence)
        postgres_verified_total = external_ev_count

        # 4. Fetch Skill Assessments & Calculate Exact Platform Sources Breakdown
        assessments = (
            db.query(SkillAssessment)
            .join(Skill, SkillAssessment.skill_id == Skill.id)
            .filter(SkillAssessment.user_id == user_id)
            .all()
        )

        from app.services.mesh.concept_extractor import CONCEPT_TO_SKILL_SLUG, EXTERNAL_PLATFORMS

        # Map EXTERNAL Evidence to skill slugs (CodeLab excluded)
        evidence_by_skill: dict[str, set[Evidence]] = {}
        for ev in deduped_evidence:
            platform = ev.platform_connection.platform if ev.platform_connection else None
            if platform not in EXTERNAL_PLATFORMS:
                continue
            if (ev.evidence_type or "") == "code_lab_attempt":
                continue
            payload = ev.normalized_payload or {}
            ev_skills = payload.get("skills", [])
            if (ev.evidence_type or "") == "badge":
                badge_name = payload.get("badge_name")
                if badge_name:
                    ev_skills = [badge_name]
            seen_slugs = set()
            for sk_label in ev_skills:
                slug = CONCEPT_TO_SKILL_SLUG.get(sk_label) or sk_label.lower().replace(" ", "-")
                seen_slugs.add(slug)
            for slug in seen_slugs:
                evidence_by_skill.setdefault(slug, set()).add(ev)

        assessed_skills = [a for a in assessments if a.status != "NO_EVIDENCE"]
        total_assessed = len(assessed_skills)
        avg_mastery = round(sum(a.mastery_score for a in assessed_skills) / total_assessed) if total_assessed > 0 else 0

        skills_summary = []
        for a in assessments:
            slug = a.skill.slug
            sources_count = {"GitHub": 0, "LeetCode": 0, "HackerRank": 0, "CodeChef": 0, "CodeLab": 0}

            skill_evs = evidence_by_skill.get(slug, set())
            for ev in skill_evs:
                plt = ev.platform_connection.platform if ev.platform_connection else "CodeLab"
                if plt in sources_count:
                    sources_count[plt] += 1
                else:
                    sources_count["CodeLab"] += 1

            skills_summary.append({
                "skill_name": a.skill.name,
                "slug": a.skill.slug,
                "category": a.skill.category,
                "mastery": a.mastery_score,
                "status": a.status,
                "evidence_count": len(skill_evs),
                "sources": sources_count,
            })

        # 5. Next Best Action
        nba_service = NextBestActionService()
        nba = nba_service.get_next_best_action(user_id, db)

        return {
            "user_id": user_id,
            "developer_name": user_name,
            "overall_skill_score": avg_mastery,
            "total_evidence_count": postgres_verified_total,
            "external_evidence_count": external_ev_count,
            "codelab_artifacts_count": codelab_artifacts_count,
            "code_artifacts_count": artifacts_count,
            "connected_platforms": platforms_summary,
            "platform_counts": platform_counts,
            "skills": skills_summary,
            "next_best_action": nba,
        }
