"""Codeforces Platform Connector."""

from datetime import datetime
from typing import Any, Optional
import httpx

from app.services.platform.base import BasePlatformConnector

CODEFORCES_API_URL = "https://codeforces.com/api"
DEFAULT_HEADERS = {
    "User-Agent": "KnowledgeMesh-Bot/1.0",
}


class CodeforcesConnector(BasePlatformConnector):
    """Codeforces Connector fetching profile telemetry via official REST API."""

    platform_name = "Codeforces"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token
        self.headers = dict(DEFAULT_HEADERS)

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate if a public Codeforces username exists via official API."""
        if not identifier or not identifier.strip():
            return False

        username = identifier.strip()
        url = f"{CODEFORCES_API_URL}/user.info?handles={username}"

        print(f"[EXTERNAL REQUEST]\nplatform=Codeforces\nusername={username}\nendpoint={url}\nHTTP status=PENDING")

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                print(f"[EXTERNAL REQUEST]\nplatform=Codeforces\nusername={username}\nendpoint={url}\nHTTP status={res.status_code}")
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "OK":
                        result = data.get("result", [])
                        if result:
                            returned_user = result[0].get("handle", "")
                            matched = returned_user.lower() == username.lower()
                            print(
                                f"[EXTERNAL RESPONSE]\nplatform=Codeforces\nrequested_username={username}\n"
                                f"returned_username={returned_user}\nmatched_identity={matched}\ndata_count=1 if matched else 0"
                            )
                            return matched
                print(f"[EXTERNAL RESPONSE]\nplatform=Codeforces\nrequested_username={username}\nreturned_username=None\nmatched_identity=False\ndata_count=0")
        except (httpx.RequestError, httpx.TimeoutException) as err:
            print(f"[EXTERNAL RESPONSE]\nplatform=Codeforces\nrequested_username={username}\nerror={err}")
            pass
        return False

    async def fetch_profile(self, identifier: str) -> Optional[dict[str, Any]]:
        """Fetch Codeforces profile & rating via official API."""
        username = identifier.strip()
        url = f"{CODEFORCES_API_URL}/user.info?handles={username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "OK" and data.get("result"):
                        user_data = data.get("result")[0]
                        returned_username = user_data.get("handle", "")
                        if returned_username.lower() != username.lower():
                            return None
                        
                        # Fetch submissions to calculate unique total_solved
                        subs_url = f"{CODEFORCES_API_URL}/user.status?handle={returned_username}&from=1&count=1000"
                        res_subs = await client.get(subs_url)
                        total_solved = 0
                        if res_subs.status_code == 200:
                            subs_data = res_subs.json()
                            if subs_data.get("status") == "OK":
                                unique_solved = set()
                                for s in subs_data.get("result", []):
                                    if s.get("verdict") == "OK":
                                        pname = s.get("problem", {}).get("name")
                                        if pname:
                                            unique_solved.add(pname)
                                total_solved = len(unique_solved)
                        
                        return {
                            "platform": self.platform_name,
                            "username": returned_username,
                            "name": f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}".strip() or returned_username,
                            "avatar_url": user_data.get("titlePhoto") or user_data.get("avatar"),
                            "html_url": f"https://codeforces.com/profile/{returned_username}",
                            "rating": user_data.get("rating", 0),
                            "rank": user_data.get("rank", "unrated"),
                            "maxRating": user_data.get("maxRating", 0),
                            "contribution": user_data.get("contribution", 0),
                            "total_solved": total_solved
                        }
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return None

    async def fetch_recent_submissions(self, username: str, count: int = 100) -> list[dict[str, Any]]:
        """Fetch recent public Codeforces problem submissions."""
        url = f"{CODEFORCES_API_URL}/user.status?handle={username}&from=1&count={count}"
        
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "OK":
                        return data.get("result", [])
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return []

    async def fetch_rating_history(self, username: str) -> list[dict[str, Any]]:
        """Fetch Codeforces contest rating history."""
        url = f"{CODEFORCES_API_URL}/user.rating?handle={username}"
        
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "OK":
                        return data.get("result", [])
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return []

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Fetch Codeforces problem telemetry evidence."""
        username = identifier.strip()
        profile = await self.fetch_profile(username)
        submissions = await self.fetch_recent_submissions(username)
        ratings = await self.fetch_rating_history(username)

        raw_items = []
        if profile:
            raw_items.append({
                "type": "codeforces_profile_stats",
                "data": profile,
            })

        for sub in submissions:
            sub["username"] = username
            raw_items.append({
                "type": "codeforces_submission",
                "data": sub,
            })
            
        for rating in ratings:
            rating["username"] = username
            raw_items.append({
                "type": "codeforces_rating_change",
                "data": rating,
            })

        return raw_items

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize Codeforces payload into Knowledge Mesh schema."""
        item_type = raw_item.get("type", "codeforces_profile_stats")
        data = raw_item.get("data", {})

        if item_type == "codeforces_profile_stats":
            rating = data.get("rating", 0)
            return {
                "platform": self.platform_name,
                "external_id": f"codeforces_profile_{data.get('username')}",
                "title": f"Codeforces Profile: {data.get('username')} (Rating: {rating})",
                "evidence_type": "problem_solving_summary",
                "source_url": data.get("html_url"),
                "occurred_at": datetime.now().isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "rating": rating,
                    "rank": data.get("rank"),
                    "maxRating": data.get("maxRating"),
                    "total_solved": data.get("total_solved", 0),
                    "skills": ["Algorithms", "Problem Solving", "Competitive Programming"] if rating > 0 else [],
                },
            }
        elif item_type == "codeforces_rating_change":
            contest_name = data.get("contestName", "Codeforces Contest")
            contest_id = data.get("contestId")
            rank = data.get("rank", 0)
            new_rating = data.get("newRating", 0)
            old_rating = data.get("oldRating", 0)
            ts = data.get("ratingUpdateTimeSeconds")
            occurred_at = datetime.fromtimestamp(int(ts)).isoformat() if ts else datetime.now().isoformat()
            
            return {
                "platform": self.platform_name,
                "external_id": f"codeforces_rating_{data.get('username')}_{contest_id}_{ts}",
                "title": f"Codeforces Contest: {contest_name}",
                "evidence_type": "contest_performance",
                "source_url": f"https://codeforces.com/contest/{contest_id}",
                "occurred_at": occurred_at,
                "raw_payload": data,
                "normalized_payload": {
                    "contest_name": contest_name,
                    "rank": rank,
                    "old_rating": old_rating,
                    "new_rating": new_rating,
                    "rating_change": new_rating - old_rating,
                    "skills": ["Competitive Programming", "Algorithms"],
                },
            }
        else:
            problem = data.get("problem", {})
            title = problem.get("name", "Codeforces Problem")
            contest_id = problem.get("contestId")
            index = problem.get("index", "")
            status = data.get("verdict", "UNKNOWN")
            lang = data.get("programmingLanguage", "C++")
            ts = data.get("creationTimeSeconds")

            occurred_at = datetime.fromtimestamp(int(ts)).isoformat() if ts else datetime.now().isoformat()
            is_accepted = status.lower() == "ok"
            
            # Combine language and problem tags into skills
            skills = [lang, "Algorithms", "Problem Solving"]
            if problem.get("tags"):
                skills.extend([tag.title() for tag in problem.get("tags")])

            source_url = f"https://codeforces.com/contest/{contest_id}/problem/{index}" if contest_id else "https://codeforces.com/problemset"

            return {
                "platform": self.platform_name,
                "external_id": f"codeforces_sub_{data.get('id')}",
                "title": f"Codeforces Submission: {title} ({status})",
                "evidence_type": "problem_submission",
                "source_url": source_url,
                "occurred_at": occurred_at,
                "raw_payload": data,
                "normalized_payload": {
                    "problem_title": title,
                    "contest_id": contest_id,
                    "problem_index": index,
                    "status": status,
                    "language": lang,
                    "passed": is_accepted,
                    "skills": list(set(skills)), # Deduplicate
                },
            }
