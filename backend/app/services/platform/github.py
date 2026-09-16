"""GitHub Connector Implementation using HTTPX REST Client."""

import base64
import os
from datetime import datetime
from typing import Any, Optional
import httpx

from app.services.platform.base import BasePlatformConnector

GITHUB_API_BASE = "https://api.github.com"
DEFAULT_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "KnowledgeMesh-Bot/1.0",
}


class GitHubConnector(BasePlatformConnector):
    """GitHub Platform Connector performing real REST API Ingestion."""

    platform_name = "GitHub"

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token or os.getenv("GITHUB_TOKEN")
        self.headers = dict(DEFAULT_HEADERS)
        if self.auth_token:
            self.headers["Authorization"] = f"token {self.auth_token}"

    async def validate_identity(self, identifier: str, auth_type: str = "username_public") -> bool:
        """Validate whether a public GitHub username exists via official GitHub API."""
        if not identifier or not identifier.strip():
            return False

        username = identifier.strip()
        url = f"{GITHUB_API_BASE}/users/{username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return True
                if res.status_code == 404:
                    return False
                if res.status_code == 403 and "rate limit" in res.text.lower():
                    from fastapi import HTTPException
                    raise HTTPException(status_code=429, detail=f"GitHub API rate limited or blocked. {res.text}")
                return False
        except (httpx.RequestError, httpx.TimeoutException):
            return False

    async def fetch_profile(self, identifier: str) -> Optional[dict[str, Any]]:
        """Fetch developer profile statistics from GitHub API."""
        username = identifier.strip()
        url = f"{GITHUB_API_BASE}/users/{username}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "platform": self.platform_name,
                        "username": data.get("login"),
                        "name": data.get("name"),
                        "avatar_url": data.get("avatar_url"),
                        "html_url": data.get("html_url"),
                        "bio": data.get("bio"),
                        "public_repos": data.get("public_repos", 0),
                        "followers": data.get("followers", 0),
                        "following": data.get("following", 0),
                        "created_at": data.get("created_at"),
                    }
                elif res.status_code == 403 and "rate limit" in res.text.lower():
                    # Do not return fake mock profiles when rate limited.
                    return None
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return None

    async def fetch_repos(self, username: str, limit: int = 100) -> list[dict[str, Any]]:
        """Fetch developer public repositories strictly owned by username."""
        owned_repos = []
        page = 1
        print(f"[EXTERNAL REQUEST]\nplatform=GitHub\nusername={username}\nHTTP status=PENDING")
        
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            while True:
                url = f"{GITHUB_API_BASE}/users/{username}/repos?type=owner&sort=updated&per_page={limit}&page={page}"
                try:
                    res = await client.get(url)
                    print(f"[EXTERNAL REQUEST]\nplatform=GitHub\nusername={username}\nendpoint={url}\nHTTP status={res.status_code}")
                    
                    if res.status_code == 200:
                        page_repos = res.json()
                        if not page_repos:
                            break
                        
                        for r in page_repos:
                            if r.get("owner", {}).get("login", "").lower() == username.lower():
                                owned_repos.append(r)
                                
                        if len(page_repos) < limit:
                            break
                        page += 1
                    elif res.status_code == 404:
                        raise RuntimeError(f"GitHub Identity not found: {username}")
                    elif res.status_code in (403, 429):
                        limit_reset = res.headers.get("X-RateLimit-Reset", "unknown")
                        limit_remaining = res.headers.get("X-RateLimit-Remaining", "unknown")
                        raise RuntimeError(f"GitHub API rate limited or blocked. Remaining: {limit_remaining}. Resets at: {limit_reset}. {res.text}")
                    else:
                        raise RuntimeError(f"GitHub API failed with status {res.status_code}: {res.text}")
                except (httpx.RequestError, httpx.TimeoutException) as err:
                    raise RuntimeError(f"GitHub API network error: {err}")

        print(
            f"[EXTERNAL RESPONSE]\nplatform=GitHub\nrequested_username={username}\n"
            f"returned_username={username}\nmatched_identity=True\ndata_count={len(owned_repos)}"
        )
        return owned_repos

    async def fetch_events(self, username: str, limit: int = 100) -> list[dict[str, Any]]:
        """Fetch public developer activity events (pushes, PRs, issue activities)."""
        events = []
        page = 1

        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            while True:
                url = f"{GITHUB_API_BASE}/users/{username}/events/public?per_page={limit}&page={page}"
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        page_events = res.json()
                        if not page_events:
                            break
                        events.extend(page_events)
                        if len(page_events) < limit:
                            break
                        page += 1
                        # Limit to 3 pages for events to avoid excessive polling
                        if page > 3:
                            break
                    elif res.status_code == 404:
                        break # Events 404 means no events
                    elif res.status_code in (403, 429):
                        limit_reset = res.headers.get("X-RateLimit-Reset", "unknown")
                        limit_remaining = res.headers.get("X-RateLimit-Remaining", "unknown")
                        raise RuntimeError(f"GitHub API rate limited or blocked. Remaining: {limit_remaining}. Resets at: {limit_reset}. {res.text}")
                    else:
                        raise RuntimeError(f"GitHub API failed with status {res.status_code}: {res.text}")
                except (httpx.RequestError, httpx.TimeoutException) as err:
                    raise RuntimeError(f"GitHub API network error: {err}")
        return events

    async def fetch_file_content(self, owner: str, repo: str, path: str) -> Optional[dict[str, Any]]:
        """Retrieve accessible source file content from a repository."""
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    content_b64 = data.get("content", "")
                    encoding = data.get("encoding", "")
                    
                    decoded_code = None
                    if encoding == "base64" and content_b64:
                        try:
                            decoded_code = base64.b64decode(content_b64).decode("utf-8")
                        except Exception:
                            decoded_code = None

                    return {
                        "path": data.get("path"),
                        "sha": data.get("sha"),
                        "size": data.get("size"),
                        "html_url": data.get("html_url"),
                        "code_content": decoded_code,
                        "download_url": data.get("download_url"),
                    }
        except (httpx.RequestError, httpx.TimeoutException):
            pass
        return None

    async def fetch_evidence(self, identifier: str) -> list[dict[str, Any]]:
        """Orchestrate public GitHub repository & event data collection."""
        username = identifier.strip()
        repos = await self.fetch_repos(username)
        events = await self.fetch_events(username)

        evidence_raw_items = []

        # Convert repositories into raw evidence records (only for strictly verified owned repos)
        for repo in repos:
            repo_owner = repo.get("owner", {}).get("login", "")
            if repo_owner.lower() == username.lower():
                evidence_raw_items.append({
                    "type": "repository",
                    "data": repo,
                })

        # Convert events into raw evidence records
        for ev in events:
            evidence_raw_items.append({
                "type": "activity",
                "data": ev,
            })

        return evidence_raw_items

    def normalize_evidence(self, raw_item: dict[str, Any]) -> dict[str, Any]:
        """Normalize GitHub event or repository payload to Knowledge Mesh standard schema."""
        item_type = raw_item.get("type", "repository")
        data = raw_item.get("data", {})

        if item_type == "repository":
            repo_name = data.get("name", "Unknown Repo")
            full_name = data.get("full_name", repo_name)
            language = data.get("language")
            topics = data.get("topics", [])
            stars = data.get("stargazers_count", 0)
            html_url = data.get("html_url")
            updated_at_str = data.get("updated_at")

            skills = []
            if language:
                skills.append(language)
            for t in topics:
                skills.append(t.capitalize())
            if not skills:
                skills = ["Git", "Software Development"]

            return {
                "platform": self.platform_name,
                "external_id": str(data.get("id")),
                "title": f"Repository: {full_name}",
                "evidence_type": "repository",
                "source_url": html_url,
                "occurred_at": updated_at_str,
                "raw_payload": data,
                "normalized_payload": {
                    "repository_name": repo_name,
                    "full_name": full_name,
                    "primary_language": language,
                    "topics": topics,
                    "stars": stars,
                    "skills": list(set(skills)),
                    "description": data.get("description"),
                },
            }

        elif item_type == "activity":
            event_type = data.get("type", "Event")
            repo_name = data.get("repo", {}).get("name", "GitHub Event")
            created_at_str = data.get("created_at")

            action_desc = "Activity Event"
            skills = ["Git"]

            if event_type == "PushEvent":
                commits_count = len(data.get("payload", {}).get("commits", []))
                action_desc = f"Pushed {commits_count} commit(s) to {repo_name}"
                skills.append("Version Control")
            elif event_type == "PullRequestEvent":
                pr_action = data.get("payload", {}).get("action", "opened")
                action_desc = f"{pr_action.capitalize()} PR in {repo_name}"
                skills.append("Code Review")
            elif event_type == "CreateEvent":
                ref_type = data.get("payload", {}).get("ref_type", "repository")
                action_desc = f"Created {ref_type} in {repo_name}"
            else:
                action_desc = f"{event_type} on {repo_name}"

            return {
                "platform": self.platform_name,
                "external_id": str(data.get("id")),
                "title": action_desc,
                "evidence_type": "commit" if event_type == "PushEvent" else "activity",
                "source_url": f"https://github.com/{repo_name}",
                "occurred_at": created_at_str,
                "raw_payload": data,
                "normalized_payload": {
                    "event_type": event_type,
                    "repository": repo_name,
                    "skills": skills,
                },
            }

        elif item_type == "code_file":
            path = data.get("path", "")
            return {
                "platform": self.platform_name,
                "external_id": str(data.get("sha")),
                "title": f"Source File: {path}",
                "evidence_type": "code_file",
                "source_url": data.get("html_url"),
                "occurred_at": datetime.now().isoformat(),
                "raw_payload": data,
                "normalized_payload": {
                    "file_path": path,
                    "size_bytes": data.get("size", 0),
                    "code_content": data.get("code_content"),
                    "skills": ["Source Code Analysis"],
                },
            }

        # Default fallback
        return {
            "platform": self.platform_name,
            "external_id": str(data.get("id", "0")),
            "title": "GitHub Development Artifact",
            "evidence_type": "activity",
            "source_url": None,
            "occurred_at": datetime.now().isoformat(),
            "raw_payload": data,
            "normalized_payload": {
                "skills": ["Software Engineering"],
            },
        }
