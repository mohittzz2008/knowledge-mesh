"""CodeChef Platform Connector using public profile parsing."""

from datetime import datetime, timezone
import re
from html import unescape
from typing import Any, Optional
import httpx

from app.services.platform.base import BasePlatformConnector

CODECHEF_BASE_URL = "https://www.codechef.com"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def extract_codechef_solved_problems(html: str) -> list[dict[str, str]]:
    """Extract solved problem titles and codes from CodeChef user profile HTML."""
    solved_items = []
    seen_ids = set()

    # Search for section.problems-solved
    match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
    section_content = match.group(1) if match else html

    # Strategy 1: Extract problem titles from <span style="font-size: 12px">
    span_matches = re.findall(r'<span\s+style=["\']font-size:\s*12px;?["\']\s*;?>\s*(.*?)\s*</span>', section_content, re.IGNORECASE)
    for raw_title in span_matches:
        cleaned_title = unescape(re.sub(r'<[^>]+>', '', raw_title)).replace('\xa0', ' ').replace('&nbsp;', ' ').strip()
        if cleaned_title and len(cleaned_title) > 1 and cleaned_title.lower() not in seen_ids:
            seen_ids.add(cleaned_title.lower())
            code = re.sub(r'[^A-Za-z0-9_]+', '', cleaned_title.upper()) or "PROBLEM"
            solved_items.append({
                "problem_title": cleaned_title,
                "problem_code": code,
            })

    # Strategy 2: Extract problem codes/links from <a href=".../problems/CODE"> or /status/CODE
    anchor_matches = re.findall(r'<a\s+[^>]*href=["\'](?:/[^/]+)?/problems/([A-Za-z0-9_]+)["\'][^>]*>(.*?)</a>', section_content, re.IGNORECASE | re.DOTALL)
    for code, inner_text in anchor_matches:
        code_upper = code.upper()
        if code_upper in ("PRACTICE", "EASY", "MEDIUM", "HARD", "SCHOOL", "CHALLENGE"):
            continue
        cleaned_text = unescape(re.sub(r'<[^>]+>', '', inner_text)).strip() or code_upper
        if code_upper.lower() not in seen_ids:
            seen_ids.add(code_upper.lower())
            solved_items.append({
                "problem_title": cleaned_text,
                "problem_code": code_upper,
            })

    return solved_items


class CodeChefConnector(BasePlatformConnector):
    """CodeChef Connector fetching profile telemetry, star ratings, and solved problems."""

    platform_name = "CodeChef"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token
        self.headers = dict(DEFAULT_HEADERS)

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate if a public CodeChef username exists by checking public profile page status."""
        if not identifier or not identifier.strip():
            return False

        username = identifier.strip()
        url = f"{CODECHEF_BASE_URL}/users/{username}"

        print(f"[EXTERNAL REQUEST]\nplatform=CodeChef\nusername={username}\nendpoint={url}\nHTTP status=PENDING")

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0, follow_redirects=True) as client:
                res = await client.get(url)
                print(f"[EXTERNAL REQUEST]\nplatform=CodeChef\nusername={username}\nendpoint={url}\nHTTP status={res.status_code}")
                if res.status_code == 200:
                    html = res.text
                    if username.lower() in html.lower() or "rating-header" in html or "user-details" in html:
                        print(
                            f"[EXTERNAL RESPONSE]\nplatform=CodeChef\nrequested_username={username}\n"
                            f"matched_identity=True\ndata_count=1"
                        )
                        return True
                print(f"[EXTERNAL RESPONSE]\nplatform=CodeChef\nrequested_username={username}\nmatched_identity=False\ndata_count=0")
        except (httpx.RequestError, httpx.TimeoutException) as err:
            print(f"[EXTERNAL RESPONSE]\nplatform=CodeChef\nrequested_username={username}\nerror={err}")
            pass
        return False

    async def fetch_profile(self, identifier: str) -> Optional[dict[str, Any]]:
        """Fetch CodeChef profile statistics, rating, highest rating, star tier, and solved problems."""
        if not identifier or not identifier.strip():
            return None

        username = identifier.strip()
        url = f"{CODECHEF_BASE_URL}/users/{username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None

                html = res.text

                # Extract rating number
                rating = 0
                rating_match = re.search(r'rating-number.*?>\s*(\d+)\s*<', html)
                if rating_match:
                    try:
                        rating = int(rating_match.group(1))
                    except ValueError:
                        rating = 0

                # Extract highest rating
                highest_rating = rating
                highest_match = re.search(r'Highest Rating\s*(\d+)', html, re.IGNORECASE)
                if highest_match:
                    try:
                        highest_rating = int(highest_match.group(1))
                    except ValueError:
                        highest_rating = rating

                # Extract star rating (e.g. 1★, 2★, 3★, 4★, 5★, 6★, 7★)
                stars = "1★"
                star_match = re.search(r'rating-star.*?>\s*(.*?)\s*<', html, re.DOTALL)
                if star_match and star_match.group(1).strip():
                    stars = star_match.group(1).strip()
                elif rating >= 2500:
                    stars = "7★"
                elif rating >= 2200:
                    stars = "6★"
                elif rating >= 2000:
                    stars = "5★"
                elif rating >= 1800:
                    stars = "4★"
                elif rating >= 1600:
                    stars = "3★"
                elif rating >= 1400:
                    stars = "2★"

                # Extract global rank
                global_rank = 0
                rank_match = re.search(r'Global Rank:?.*?>\s*(\d+)\s*<', html, re.IGNORECASE)
                if rank_match:
                    try:
                        global_rank = int(rank_match.group(1))
                    except ValueError:
                        global_rank = 0

                # Extract solved problems from HTML
                solved_problems = extract_codechef_solved_problems(html)
                solved_codes = [p["problem_code"] for p in solved_problems]

                # Extract total solved count header if present
                total_solved = len(solved_problems)
                header_solved_match = re.search(r'Total Problems Solved:\s*(\d+)', html, re.IGNORECASE)
                if header_solved_match:
                    try:
                        total_solved = max(total_solved, int(header_solved_match.group(1)))
                    except ValueError:
                        pass

                # Extract name
                real_name = username
                name_match = re.search(r'h1 class="h2-style">\s*(.*?)\s*<', html)
                if name_match:
                    real_name = name_match.group(1).strip() or username

                return {
                    "platform": self.platform_name,
                    "username": username,
                    "name": real_name,
                    "avatar_url": "https://cdn.codechef.com/sites/all/themes/abstrack/images/user-crop.png",
                    "html_url": url,
                    "rating": rating,
                    "highest_rating": max(rating, highest_rating),
                    "stars": stars,
                    "global_rank": global_rank,
                    "solved_problems": solved_problems,
                    "solved_codes": solved_codes,
                    "total_solved": total_solved,
                }

        except (httpx.RequestError, httpx.TimeoutException):
            pass

        return None

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Fetch CodeChef profile, star badge, and solved problem evidence."""
        username = identifier.strip()
        profile = await self.fetch_profile(username)

        raw_items = []
        if profile:
            raw_items.append({
                "type": "codechef_profile_stats",
                "data": profile,
            })

            if profile.get("stars"):
                raw_items.append({
                    "type": "codechef_star_badge",
                    "data": {
                        "username": username,
                        "badge_name": f"CodeChef {profile.get('stars')} Coder",
                        "stars": profile.get("stars"),
                        "rating": profile.get("rating", 0),
                    },
                })

            for prob in profile.get("solved_problems", []):
                raw_items.append({
                    "type": "codechef_solved_problem",
                    "data": {
                        "username": username,
                        "problem_code": prob["problem_code"],
                        "problem_title": prob["problem_title"],
                    },
                })

        return raw_items

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize raw CodeChef item into Knowledge Mesh schema."""
        item_type = raw_item.get("type", "codechef_profile_stats")
        data = raw_item.get("data", {})

        if item_type == "codechef_profile_stats":
            rating = data.get("rating", 0)
            total_solved = data.get("total_solved", 0)
            return {
                "platform": self.platform_name,
                "external_id": f"codechef_profile_{data.get('username')}",
                "title": f"CodeChef Profile: {data.get('username')} (Rating: {rating})",
                "evidence_type": "problem_solving_summary",
                "source_url": data.get("html_url"),
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "rating": rating,
                    "highest_rating": data.get("highest_rating", rating),
                    "stars": data.get("stars", "1★"),
                    "global_rank": data.get("global_rank", 0),
                    "total_solved": total_solved,
                    "skills": ["Algorithms", "Data Structures", "Problem Solving", "Competitive Programming"] if (rating > 0 or total_solved > 0) else [],
                },
            }
        elif item_type == "codechef_star_badge":
            badge_name = data.get("badge_name", "CodeChef Coder")
            stars_str = str(data.get("stars", "1"))
            stars_num = int(stars_str[0]) if stars_str[0].isdigit() else 1
            return {
                "platform": self.platform_name,
                "external_id": f"codechef_badge_{data.get('username')}_{stars_num}",
                "title": f"CodeChef Badge: {badge_name}",
                "evidence_type": "badge",
                "source_url": f"https://www.codechef.com/users/{data.get('username')}",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "badge_name": badge_name,
                    "stars": stars_num,
                    "rating": data.get("rating", 0),
                    "skills": ["Competitive Programming", "Algorithms"],
                },
            }
        else:
            code = data.get("problem_code", "UNKNOWN")
            title = data.get("problem_title") or f"CodeChef Problem: {code}"
            return {
                "platform": self.platform_name,
                "external_id": f"codechef_prob_{data.get('username')}_{code}",
                "title": f"CodeChef Solved Challenge: {title}",
                "evidence_type": "problem_submission",
                "source_url": f"https://www.codechef.com/problems/{code}",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "problem_code": code,
                    "problem_title": title,
                    "status": "Solved",
                    "passed": True,
                    "skills": ["Math", "Algorithms", "Problem Solving"],
                },
            }
