"""Exercism Platform Connector."""

from datetime import datetime
from typing import Any, Optional
import httpx

from app.services.platform.base import BasePlatformConnector

EXERCISM_API_URL = "https://exercism.org/api/v2"

class ExercismConnector(BasePlatformConnector):
    """Exercism Connector using public reputation data and optional API keys."""

    platform_name = "Exercism"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token
        self.headers = {
            "User-Agent": "KnowledgeMesh-Bot/1.0",
        }
        if self.auth_token:
            self.headers["Authorization"] = f"Bearer {self.auth_token}"

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate Exercism username via public API."""
        if not identifier or not identifier.strip():
            return False

        username = identifier.strip()
        url = f"{EXERCISM_API_URL}/users/{username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    handle = data.get("handle", "")
                    return handle.lower() == username.lower()
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return False

    async def fetch_profile(self, identifier: str) -> Optional[dict[str, Any]]:
        """Fetch Exercism profile and reputation."""
        username = identifier.strip()
        url = f"{EXERCISM_API_URL}/users/{username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return None

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Fetch Exercism evidence (public reputation metrics)."""
        username = identifier.strip()
        profile = await self.fetch_profile(username)

        raw_items = []
        if profile:
            raw_items.append({
                "type": "exercism_reputation",
                "data": profile,
            })

            # If we wanted to fetch authenticated solutions, we'd do it here.
            # E.g. fetch /api/v2/solutions using self.auth_token
            
        return raw_items

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize Exercism payload into Knowledge Mesh schema."""
        item_type = raw_item.get("type", "exercism_reputation")
        data = raw_item.get("data", {})

        if item_type == "exercism_reputation":
            handle = data.get("handle")
            reputation = data.get("reputation", {})
            total_rep = reputation.get("total", "0")
            
            # Reputation 'tracks' contains { language_slug: score }
            tracks = reputation.get("tracks", {})
            skills = list(tracks.keys())
            
            # Since Exercism doesn't provide total_solved in public API, 
            # we rely on track activity to generate concepts.
            return {
                "platform": self.platform_name,
                "external_id": f"exercism_profile_{handle}",
                "title": f"Exercism Profile: {handle} (Reputation: {total_rep})",
                "evidence_type": "problem_solving_summary",
                "source_url": f"https://exercism.org/profiles/{handle}",
                "occurred_at": datetime.now().isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "total_reputation": total_rep,
                    "active_tracks_count": len(skills),
                    "skills": skills,
                },
            }
        return {}
