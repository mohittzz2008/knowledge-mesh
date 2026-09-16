"""AtCoder Platform Connector."""

import httpx
import re
import json
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

from app.services.platform.base import BasePlatformConnector


class AtCoderConnector(BasePlatformConnector):
    """Integrates AtCoder identity, rating, and unique solved problems."""

    platform_name = "AtCoder"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate an AtCoder username by checking the public profile."""
        url = f"https://atcoder.jp/users/{identifier}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            return response.status_code == 200

    async def fetch_profile(self, identifier: str) -> Optional[dict[str, Any]]:
        """Fetch AtCoder profile data including rating from the public HTML."""
        url = f"https://atcoder.jp/users/{identifier}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code != 200:
                return None
            
            html = response.text
            
            current_rating = 0
            highest_rating = 0
            
            # Extract rank_history from the script payload
            match = re.search(r"var rank_history=(\[.*?\]);", html)
            if match:
                try:
                    history = json.loads(match.group(1))
                    if history:
                        current_rating = history[-1].get("Rating", 0)
                        highest_rating = max(h.get("Rating", 0) for h in history)
                except json.JSONDecodeError:
                    pass

            return {
                "handle": identifier,
                "current_rating": current_rating,
                "highest_rating": highest_rating,
            }

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Fetch AtCoder submissions from AtCoderProblems API to calculate unique solved."""
        submissions = []
        from_second = 0
        
        async with httpx.AsyncClient() as client:
            while True:
                url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={identifier}&from_second={from_second}"
                response = await client.get(url)
                if response.status_code != 200:
                    raise RuntimeError(f"AtCoderProblems API unavailable: HTTP {response.status_code}")
                
                batch = response.json()
                if not batch:
                    break
                    
                submissions.extend(batch)
                
                if len(batch) < 500:
                    break
                
                from_second = batch[-1].get("epoch_second", from_second) + 1
                await asyncio.sleep(1.0) # Respect 1 req/sec rate limit

        solved_problem_ids = set()
        languages = set()
        total_submissions = len(submissions)
        
        for sub in submissions:
            if sub.get("result") == "AC":
                solved_problem_ids.add(sub.get("problem_id"))
            
            lang = sub.get("language", "")
            if lang:
                # E.g. "C++14 (GCC 5.4.1)" -> "c++14"
                base_lang = lang.split()[0].lower()
                languages.add(base_lang)
                
        raw_items = []
        if profile := await self.fetch_profile(identifier):
            raw_items.append({
                "type": "atcoder_profile_stats",
                "data": profile,
                "total_solved": len(solved_problem_ids),
                "total_submissions": total_submissions,
                "languages": list(languages)
            })
            
        return raw_items

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize raw evidence into Knowledge Mesh schema."""
        item_type = raw_item.get("type")
        data = raw_item.get("data", {})
        
        if item_type == "atcoder_profile_stats":
            handle = data.get("handle")
            current_rating = data.get("current_rating", 0)
            highest_rating = data.get("highest_rating", 0)
            
            return {
                "platform": self.platform_name,
                "external_id": f"atcoder_profile_{handle}",
                "title": f"AtCoder Profile: {handle} (Rating: {current_rating})",
                "evidence_type": "problem_solving_summary",
                "source_url": f"https://atcoder.jp/users/{handle}",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "raw_payload": raw_item,
                "normalized_payload": {
                    "rating": current_rating,
                    "maxRating": highest_rating,
                    "total_solved": raw_item.get("total_solved", 0),
                    "total_submissions": raw_item.get("total_submissions", 0),
                    "skills": raw_item.get("languages", []),
                }
            }
        
        return {}
