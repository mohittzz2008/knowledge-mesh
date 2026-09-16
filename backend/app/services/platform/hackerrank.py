"""HackerRank Platform Connector using REST API Ingestion."""

import asyncio
from datetime import datetime
from typing import Any, Optional
import httpx

from app.services.platform.base import BasePlatformConnector

HACKERRANK_API_BASE = "https://www.hackerrank.com/rest/hackers"
DEFAULT_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


class HackerRankConnector(BasePlatformConnector):
    """HackerRank Connector fetching badges & profile telemetry via REST API."""

    platform_name = "HackerRank"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token
        self.headers = dict(DEFAULT_HEADERS)

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate if a public HackerRank username exists via official REST API."""
        if not identifier or not identifier.strip():
            return False

        username = identifier.strip()
        url = f"https://www.hackerrank.com/rest/contests/master/hackers/{username}/profile"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("model") and data.get("model", {}).get("username"):
                        return True
                elif res.status_code in (403, 429):
                    from fastapi import HTTPException
                    raise HTTPException(status_code=429, detail=f"HackerRank API rate limited or blocked. {res.text}")
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return False

    async def fetch_profile(
        self, identifier: str, badges: Optional[list[dict[str, Any]]] = None
    ) -> Optional[dict[str, Any]]:
        """Fetch HackerRank profile statistics and badges."""
        username = identifier.strip()
        url = f"https://www.hackerrank.com/rest/contests/master/hackers/{username}/profile"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    m = res.json().get("model", {})

                    # Aggregate real solved count from HackerRank badges
                    if badges is None:
                        badges = await self.fetch_badges(username)

                    total_solved = None
                    if badges:
                        seen_badges = set()
                        calc_solved = 0
                        has_valid_solved = False
                        for b in badges:
                            badge_key = b.get("badge_name") or b.get("badge_type")
                            if not badge_key or badge_key in seen_badges:
                                continue
                            seen_badges.add(badge_key)

                            solved_val = b.get("solved")
                            if isinstance(solved_val, int):
                                has_valid_solved = True
                                calc_solved += solved_val

                        if has_valid_solved:
                            total_solved = calc_solved

                    return {
                        "platform": self.platform_name,
                        "username": m.get("username"),
                        "name": m.get("name") or m.get("username"),
                        "avatar_url": m.get("avatar"),
                        "html_url": f"https://www.hackerrank.com/profile/{m.get('username')}",
                        "country": m.get("country"),
                        "school": m.get("school"),
                        "level": m.get("level", 1),
                        "total_solved": total_solved,
                    }
                elif res.status_code == 404:
                    raise RuntimeError(f"HackerRank Identity not found: {username}")
                elif res.status_code in (403, 429):
                    raise RuntimeError(f"HackerRank API rate limited: {res.text}")
                else:
                    raise RuntimeError(f"HackerRank API failed with status {res.status_code}: {res.text}")
        except (httpx.RequestError, httpx.TimeoutException) as err:
            raise RuntimeError(f"HackerRank API network error: {err}")
        return None

    async def fetch_badges(self, username: str) -> list[dict[str, Any]]:
        """Fetch developer HackerRank skill badges (Algorithms, Python, Problem Solving)."""
        url = f"{HACKERRANK_API_BASE}/{username}/badges"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return res.json().get("models", [])
                elif res.status_code == 404:
                    return [] # Valid, user may just have no badges
                elif res.status_code in (403, 429):
                    raise RuntimeError(f"HackerRank API rate limited: {res.text}")
                else:
                    raise RuntimeError(f"HackerRank API failed with status {res.status_code}: {res.text}")
        except (httpx.RequestError, httpx.TimeoutException) as err:
            raise RuntimeError(f"HackerRank API network error: {err}")
        return []

    async def fetch_challenge_metadata(
        self, challenge_slug: str, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[dict[str, Any]]:
        """Fetch metadata for a challenge (track, subdomain, topic) via REST API."""
        url = f"https://www.hackerrank.com/rest/contests/master/challenges/{challenge_slug}"
        try:
            if client:
                res = await client.get(url)
            else:
                async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as c:
                    res = await c.get(url)
            if res.status_code == 200:
                return res.json().get("model", {})
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return None

    async def fetch_recent_challenges(
        self, identifier: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        """Fetch recently solved HackerRank challenges with verified topic/track metadata."""
        if not identifier or not identifier.strip():
            return []

        username = identifier.strip()
        url = f"{HACKERRANK_API_BASE}/{username}/recent_challenges?offset=0&limit={limit}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    raw_challenges = res.json().get("models", [])
                elif res.status_code == 404:
                    return []
                elif res.status_code in (403, 429):
                    raise RuntimeError(f"HackerRank API rate limited: {res.text}")
                else:
                    raise RuntimeError(
                        f"HackerRank API failed with status {res.status_code}: {res.text}"
                    )

                # Enrich with track/topic metadata only when required
                enriched_challenges: list[dict[str, Any]] = []
                tasks = []
                indices_to_fetch = []

                for idx, ch in enumerate(raw_challenges):
                    # If topic/track info is already present, use directly
                    if ch.get("track") or ch.get("topic") or ch.get("topics"):
                        enriched_challenges.append(ch)
                    else:
                        slug = ch.get("ch_slug") or ch.get("slug")
                        if slug:
                            tasks.append(self.fetch_challenge_metadata(slug, client=client))
                            indices_to_fetch.append(idx)
                        enriched_challenges.append(dict(ch))

                if tasks:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for idx, meta in zip(indices_to_fetch, results):
                        if isinstance(meta, dict) and meta:
                            enriched_challenges[idx]["track"] = meta.get("track")
                            enriched_challenges[idx]["preview"] = meta.get("preview")
                            enriched_challenges[idx]["difficulty_name"] = meta.get("difficulty_name")

                return enriched_challenges

        except (httpx.RequestError, httpx.TimeoutException) as err:
            raise RuntimeError(f"HackerRank API network error: {err}")

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Fetch HackerRank skill badges and recent solved challenge telemetry evidence."""
        username = identifier.strip()
        badges = await self.fetch_badges(username)
        profile = await self.fetch_profile(username, badges=badges)
        challenges = await self.fetch_recent_challenges(username)

        raw_items = []
        if profile:
            raw_items.append({
                "type": "hackerrank_profile",
                "data": profile,
            })

        for b in badges:
            raw_items.append({
                "type": "hackerrank_badge",
                "data": b,
            })

        for ch in challenges:
            raw_items.append({
                "type": "hackerrank_challenge",
                "data": ch,
            })

        return raw_items

    def _extract_challenge_skills(self, data: dict[str, Any]) -> list[str]:
        """Extract verified topic skills from HackerRank challenge metadata."""
        # 1. Direct skills if already provided in raw payload
        raw_skills = data.get("skills")
        if isinstance(raw_skills, list) and raw_skills:
            return [s for s in raw_skills if isinstance(s, str)]

        skills: list[str] = []

        # 2. Extract track and challenge attributes
        track = data.get("track") or {}
        track_name = str(track.get("track_name") or data.get("track_name") or "").strip()
        sub_name = str(track.get("name") or data.get("sub_name") or "").strip()
        sub_slug = str(track.get("slug") or data.get("sub_slug") or "").strip().lower()
        ch_name = str(data.get("name") or data.get("title") or "").strip()
        ch_slug = str(data.get("ch_slug") or data.get("slug") or "").strip().lower()
        preview = str(data.get("preview") or "").lower()
        ch_name_lower = ch_name.lower()

        # Topic detection based strictly on verified HackerRank metadata
        # Sets: track is Sets or sub_slug is py-sets or explicit set challenge
        if (
            sub_name.lower() == "sets"
            or sub_slug == "py-sets"
            or ch_slug.startswith("py-set")
            or "set" in sub_slug
            or "sets" in ch_slug
            or "sets" in ch_name_lower
            or ch_name_lower.startswith("set ")
        ):
            skills.append("Sets")

        # Functions: explicit function challenge in Introduction or title/slug
        elif (
            sub_name.lower() == "functions"
            or "function" in ch_slug
            or "function" in ch_name_lower
        ):
            skills.append("Functions")

        # Lists / List Comprehensions: Basic Data Types list challenges or title/slug
        elif (
            sub_name.lower() == "lists"
            or sub_slug == "py-lists"
            or "list" in ch_slug
            or "list" in ch_name_lower
        ):
            if "list comprehension" in ch_name_lower or "list-comprehension" in ch_slug:
                skills.append("List Comprehensions")
            skills.append("Lists")

        # Arrays: Warmup array challenge (Simple Array Sum) or Arrays subdomain
        elif (
            sub_name.lower() == "arrays"
            or sub_slug == "arrays"
            or "array" in ch_slug
            or "array" in ch_name_lower
        ):
            skills.append("Arrays")

        # Dictionaries:
        elif (
            sub_name.lower() in ("dictionaries", "hash map", "dict")
            or "dict" in ch_slug
            or "dictionary" in ch_name_lower
        ):
            skills.append("Dictionaries")

        # Trees:
        elif sub_name.lower() in ("trees", "binary search tree") or "tree" in ch_slug:
            skills.append("Tree Traversal")

        # DFS:
        elif "dfs" in ch_slug or "depth-first" in ch_name_lower:
            skills.append("DFS")

        # Add domain-level track skills
        if track_name.lower() == "algorithms" or sub_name.lower() == "warmup":
            if "Algorithms" not in skills:
                skills.append("Algorithms")
            if "Problem Solving" not in skills:
                skills.append("Problem Solving")
        elif track_name.lower() == "python":
            if "Python" not in skills:
                skills.append("Python")
        elif track_name.lower() == "c":
            if "C" not in skills:
                skills.append("C")

        # Fallback if no skills identified yet
        if not skills:
            if sub_name:
                skills.append(sub_name)
            elif track_name:
                skills.append(track_name)
            else:
                skills.append("Problem Solving")

        return skills

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize HackerRank badge/profile/challenge payload into Knowledge Mesh schema."""
        item_type = raw_item.get("type", "hackerrank_profile")
        data = raw_item.get("data", {})

        if item_type == "hackerrank_profile":
            return {
                "platform": self.platform_name,
                "external_id": f"hackerrank_profile_{data.get('username')}",
                "title": f"HackerRank Profile: {data.get('username')}",
                "evidence_type": "profile",
                "source_url": data.get("html_url"),
                "occurred_at": datetime.now().isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "skills": ["Algorithms", "Problem Solving"],
                    "level": data.get("level", 1),
                    "total_solved": data.get("total_solved"),
                },
            }
        elif item_type == "hackerrank_challenge":
            name = data.get("name") or data.get("title", "HackerRank Challenge")
            slug = data.get("ch_slug") or data.get("slug", "challenge")
            url_path = data.get("url", f"/challenges/{slug}/problem")
            source_url = f"https://www.hackerrank.com{url_path}" if url_path.startswith("/") else url_path
            created_at = data.get("created_at") or datetime.now().isoformat()

            track = data.get("track") or {}
            track_name = track.get("track_name") or data.get("track_name", "")
            sub_name = track.get("name") or data.get("sub_name", "")

            skills = self._extract_challenge_skills(data)
            primary_topic = skills[0] if skills else (sub_name or track_name or "Problem Solving")

            return {
                "platform": self.platform_name,
                "external_id": f"hackerrank_challenge_{slug}",
                "title": f"HackerRank Challenge: {name} (Solved)",
                "evidence_type": "problem_submission",
                "source_url": source_url,
                "occurred_at": created_at,
                "raw_payload": data,
                "normalized_payload": {
                    "challenge_title": name,
                    "challenge_slug": slug,
                    "status": "Solved",
                    "solved": True,
                    "track": track_name,
                    "subdomain": sub_name,
                    "topic": primary_topic,
                    "skills": skills,
                },
            }
        else:
            badge_name = data.get("badge_name", "Skill Badge")
            stars = data.get("stars", 1)
            hatch = data.get("hatch_level", "Bronze")

            return {
                "platform": self.platform_name,
                "external_id": f"hackerrank_badge_{badge_name}_{stars}",
                "title": f"HackerRank Badge: {badge_name} ({stars} Stars - {hatch})",
                "evidence_type": "badge",
                "source_url": f"https://www.hackerrank.com/profile/{data.get('username', 'user')}",
                "occurred_at": datetime.now().isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "badge_name": badge_name,
                    "stars": stars,
                    "hatch_level": hatch,
                    "skills": [badge_name, "Problem Solving"],
                },
            }

