"""API endpoints for Multi-Platform Connectors, Central Registry, and Ingestion."""

from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, DeveloperProfile
from app.models.platform import PlatformConnection
from app.models.evidence import Evidence
from app.models.code_artifact import CodeArtifact
from app.schemas.platform import (
    PlatformValidateRequest,
    PlatformValidateResponse,
    PlatformSyncRequest,
    PlatformSyncResponse,
    PlatformRegistryItemSchema,
)
from app.services.platform.registry import PlatformRegistry
from app.services.mesh.concept_extractor import ConceptExtractorService

from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/platforms", tags=["Platforms"])


@router.get("", response_model=list[PlatformRegistryItemSchema])
def list_registered_platforms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List registered developer platform connectors, capabilities, and connection states."""
    user_connections = db.query(PlatformConnection).filter(PlatformConnection.user_id == current_user.id).all()
    conn_map = {c.platform.lower(): c for c in user_connections}

    items = PlatformRegistry.list_items()
    result = []
    for item in items:
        d = item.to_dict()
        conn = conn_map.get(item.key)
        d["connected"] = conn.connected if conn else False
        d["connected_username"] = conn.username if conn else None
        result.append(PlatformRegistryItemSchema.model_validate(d))
    return result


@router.post("/{platform_key}/validate", response_model=PlatformValidateResponse)
async def validate_platform_identity(
    platform_key: str,
    payload: PlatformValidateRequest,
):
    """Validate user identity dynamically across registered platform connectors."""
    connector = PlatformRegistry.get_connector_instance(platform_key)
    if not connector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform connector '{platform_key}' is not registered.",
        )

    username = payload.username.strip()
    is_valid = await connector.validate_identity(username)
    if not is_valid:
        return PlatformValidateResponse(
            platform=connector.platform_name,
            username=username,
            valid=False,
            detail=f"{connector.platform_name} identity '{username}' was not found or is inaccessible.",
        )

    profile_data = await connector.fetch_profile(username) or {}
    return PlatformValidateResponse(
        platform=connector.platform_name,
        username=username,
        valid=True,
        avatar_url=profile_data.get("avatar_url"),
        bio=profile_data.get("bio"),
        public_repos=profile_data.get("public_repos", 0),
        followers=profile_data.get("followers", 0),
        detail=f"{connector.platform_name} identity verified successfully.",
    )


@router.post("/{platform_key}/disconnect")
def disconnect_platform(
    platform_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect a platform and recalculate assessments without deleting historical evidence."""
    connector = PlatformRegistry.get_connector_instance(platform_key)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Platform '{platform_key}' not found.")
    
    connection = (
        db.query(PlatformConnection)
        .filter(
            PlatformConnection.user_id == current_user.id,
            PlatformConnection.platform == connector.platform_name,
        )
        .first()
    )
    if connection and connection.connected:
        connection.connected = False
        db.commit()

        # Recalculate mesh to drop disconnected evidence
        extractor = ConceptExtractorService()
        extractor.extract_and_assess_user_skills(current_user.id, db)

    return {"message": f"Successfully disconnected {connector.platform_name}."}


@router.post("/{platform_key}/sync", response_model=PlatformSyncResponse)
async def sync_platform_data(
    platform_key: str,
    payload: PlatformSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ingest, normalize, and persist multi-platform developer evidence into PostgreSQL."""
    connector = PlatformRegistry.get_connector_instance(platform_key, auth_token=payload.auth_token)
    if not connector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform connector '{platform_key}' is not registered.",
        )

    username = payload.username.strip()
    user = current_user

    print(
        f"\n[PLATFORM SYNC START]\n"
        f"authenticated_user_id={user.id}\n"
        f"platform={connector.platform_name}\n"
        f"requested_username={username}"
    )

    # 1. Validate Identity
    is_valid = await connector.validate_identity(username)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{connector.platform_name} user '{username}' not found on platform.",
        )

    # Count evidence before sync
    evidence_before = (
        db.query(Evidence)
        .filter(Evidence.user_id == user.id)
        .count()
    )

    # 2. Find or create PlatformConnection in PostgreSQL
    connection = (
        db.query(PlatformConnection)
        .filter(
            PlatformConnection.user_id == user.id,
            PlatformConnection.platform == connector.platform_name,
        )
        .first()
    )

    if not connection:
        connection = PlatformConnection(
            user_id=user.id,
            platform=connector.platform_name,
            auth_type=payload.auth_type,
            username=username,
            connected=True,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
    else:
        # STEP 12: Username Switching — purge old user's evidence & artifacts when username changes
        if connection.username != username:
            print(f"[USERNAME SWITCH DETECTED] Purging stale evidence for platform {connector.platform_name}: previous='{connection.username}' -> new='{username}'")
            db.query(Evidence).filter(Evidence.platform_connection_id == connection.id).delete()
            db.query(CodeArtifact).filter(
                CodeArtifact.platform_connection_id == connection.id,
                CodeArtifact.platform != "CodeLab",
            ).delete()
            db.commit()

        connection.username = username
        connection.auth_type = payload.auth_type
        connection.connected = True
        connection.updated_at = datetime.now(timezone.utc)
        db.commit()

    # 3. Fetch & Normalize Evidence Telemetry
    try:
        profile_data = await connector.fetch_profile(username) or {}
        raw_evidence_list = await connector.fetch_evidence(username)
    except RuntimeError as e:
        if "rate limit" in str(e).lower():
            raise HTTPException(status_code=429, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))

    print(
        f"[NORMALIZATION]\n"
        f"normalized_records={len(raw_evidence_list)}"
    )

    synced_count = 0
    for item in raw_evidence_list:
        normalized = connector.normalize_evidence(item)
        external_id = normalized.get("external_id")

        existing_evidence = None
        if external_id:
            existing_evidence = (
                db.query(Evidence)
                .filter(
                    Evidence.platform_connection_id == connection.id,
                    Evidence.external_id == external_id,
                )
                .first()
            )

        if not existing_evidence:
            occurred_at = None
            occ_str = normalized.get("occurred_at")
            if occ_str:
                try:
                    occurred_at = datetime.fromisoformat(occ_str.replace("Z", "+00:00"))
                except Exception:
                    occurred_at = datetime.now(timezone.utc)

            evidence_record = Evidence(
                user_id=user.id,
                platform_connection_id=connection.id,
                external_id=external_id,
                title=normalized.get("title", f"{connector.platform_name} Evidence"),
                evidence_type=normalized.get("evidence_type", "activity"),
                raw_payload=normalized.get("raw_payload"),
                normalized_payload=normalized.get("normalized_payload"),
                occurred_at=occurred_at,
            )
            db.add(evidence_record)
            synced_count += 1

    connection.last_synced_at = datetime.now(timezone.utc)
    db.commit()

    evidence_after = (
        db.query(Evidence)
        .filter(Evidence.user_id == user.id)
        .count()
    )

    print(
        f"[DATABASE]\n"
        f"evidence_before={evidence_before}\n"
        f"evidence_inserted={synced_count}\n"
        f"evidence_after={evidence_after}"
    )

    # 4. Re-evaluate Knowledge Mesh Skill Assessments
    extractor = ConceptExtractorService()
    assessments = extractor.extract_and_assess_user_skills(user.id, db)

    assessed_count = len([a for a in assessments if a.status != "NO_EVIDENCE"])
    print(
        f"[KNOWLEDGE MESH]\n"
        f"skills_generated={len(assessments)}\n"
        f"evidence_used={evidence_after}"
    )

    from app.services.mesh.unified_profile import UnifiedProfileService
    prof_svc = UnifiedProfileService()
    unified = prof_svc.get_unified_profile(user.id, db)

    print(
        f"[PROFILE]\n"
        f"total_evidence={unified['total_evidence_count']}\n"
        f"platform_counts={unified['platform_counts']}\n"
    )

    sync_msg = (
        f"Successfully ingested {synced_count} real {connector.platform_name} evidence item(s) for '{username}'."
        if synced_count > 0
        else f"Sync complete for '{username}'. No new public evidence items found on platform."
    )

    return PlatformSyncResponse(
        platform_connection_id=connection.id,
        platform=connector.platform_name,
        username=username,
        connected=True,
        synced_evidence_count=synced_count,
        profile_summary={
            "public_repos": profile_data.get("public_repos", 0),
            "total_solved": profile_data.get("total_solved"),
            "followers": profile_data.get("followers", 0),
            "avatar_url": profile_data.get("avatar_url"),
            "html_url": profile_data.get("html_url"),
            "bio": profile_data.get("bio"),
        },
        last_synced_at=connection.last_synced_at,
        message=sync_msg,
    )
