"""Platform Connector Initialization & Central Registry Registration."""

from app.services.platform.base import BasePlatformConnector
from app.services.platform.github import GitHubConnector
from app.services.platform.leetcode import LeetCodeConnector
from app.services.platform.hackerrank import HackerRankConnector
from app.services.platform.codeforces import CodeforcesConnector
from app.services.platform.exercism import ExercismConnector
from app.services.platform.atcoder import AtCoderConnector
from app.services.platform.codechef import CodeChefConnector
from app.services.platform.registry import (
    PlatformRegistry,
    PlatformRegistryItem,
    PlatformCapability,
    PlatformStatus,
)

# Register CodeChef Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="codechef",
        name="CodeChef",
        connector_class=CodeChefConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.PUBLIC_SUBMISSIONS,
            PlatformCapability.PUBLIC_PROBLEM_HISTORY,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public profile rating, star tier (1★ to 7★), global rank, and solved problem codes.",
        documentation_url="https://www.codechef.com",
    )
)

# Register GitHub Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="github",
        name="GitHub",
        connector_class=GitHubConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.PUBLIC_ACTIVITY,
            PlatformCapability.PUBLIC_REPOSITORIES,
            PlatformCapability.PUBLIC_SOURCE_CODE,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public repositories, commits, AST code files, and activity events.",
        documentation_url="https://docs.github.com/en/rest",
    )
)

# Register LeetCode Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="leetcode",
        name="LeetCode",
        connector_class=LeetCodeConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.PUBLIC_SUBMISSIONS,
            PlatformCapability.PUBLIC_PROBLEM_HISTORY,
            PlatformCapability.LIMITED_API,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public profile stats, problem-solving count, difficulty breakdown, recent submission history.",
        documentation_url="https://leetcode.com/graphql",
    )
)

# Register HackerRank Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="hackerrank",
        name="HackerRank",
        connector_class=HackerRankConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.LIMITED_API,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public hacker profile, skill badges (Algorithms, Python, Problem Solving), levels.",
        documentation_url="https://www.hackerrank.com",
    )
)

# Register Codeforces Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="codeforces",
        name="Codeforces",
        connector_class=CodeforcesConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.PUBLIC_SUBMISSIONS,
            PlatformCapability.PUBLIC_PROBLEM_HISTORY,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public profile rating, contest history, and problem submission statistics.",
        documentation_url="https://codeforces.com/apiHelp",
    )
)

# Register Exercism Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="exercism",
        name="Exercism",
        connector_class=ExercismConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.OAUTH_REQUIRED,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="api_key",
        data_scope_description="Requires API Key. Fetches language tracks, reputation, and completed exercises.",
        documentation_url="https://exercism.org/docs/api",
    )
)

# Register AtCoder Connector
PlatformRegistry.register(
    PlatformRegistryItem(
        key="atcoder",
        name="AtCoder",
        connector_class=AtCoderConnector,
        capabilities=[
            PlatformCapability.PUBLIC_PROFILE,
            PlatformCapability.PUBLIC_SUBMISSIONS,
        ],
        status=PlatformStatus.AVAILABLE,
        auth_type="username_public",
        data_scope_description="Public profile rating, contest history, and unique solved problems.",
        documentation_url="https://github.com/kenkoooo/AtCoderProblems",
    )
)

__all__ = [
    "BasePlatformConnector",
    "GitHubConnector",
    "LeetCodeConnector",
    "HackerRankConnector",
    "CodeforcesConnector",
    "ExercismConnector",
    "AtCoderConnector",
    "CodeChefConnector",
    "PlatformRegistry",
    "PlatformRegistryItem",
    "PlatformCapability",
    "PlatformStatus",
]

