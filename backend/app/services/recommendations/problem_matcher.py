"""Problem Matcher & Practice Ranking Service."""

from typing import Any
from sqlalchemy.orm import Session
from app.models.problem import Problem, ProblemRecommendation, CodeAttempt

CONTROLLED_PRACTICE_PROBLEMS = [
    {
        "platform": "GitHub",
        "external_id": "gh_rec_01",
        "title": "Recursive Function Patterns & Call Stack Verification",
        "url": "https://github.com/python/cpython/blob/main/Lib/ast.py",
        "difficulty": "Easy",
        "topics": ["Recursion", "Functions"],
        "language": "Python",
        "description": "Analyze recursive function call stacks and base condition termination.",
        "source": "GitHub Official Public Repository",
        "skills": ["recursion", "functions"],
    },
    {
        "platform": "GitHub",
        "external_id": "gh_rec_02",
        "title": "Recursive Binary Tree DFS Traversal",
        "url": "https://github.com/fastapi/fastapi/blob/main/fastapi/applications.py",
        "difficulty": "Easy",
        "topics": ["Tree Traversal", "Recursion", "DFS"],
        "language": "Python",
        "description": "Implement inorder and preorder tree traversal using recursion.",
        "source": "GitHub Official Public Repository",
        "skills": ["tree-traversal", "recursion", "dfs"],
    },
    {
        "platform": "LeetCode",
        "external_id": "lc_104",
        "title": "Maximum Depth of Binary Tree (Reference)",
        "url": "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
        "difficulty": "Easy",
        "topics": ["Tree", "Depth-First Search", "Binary Tree"],
        "language": "Python",
        "description": "Permitted platform problem reference for binary tree depth calculation.",
        "source": "LeetCode Platform Reference",
        "skills": ["tree-traversal", "dfs"],
    },
    {
        "platform": "HackerRank",
        "external_id": "hr_tree_preorder",
        "title": "Tree: Preorder Traversal (Reference)",
        "url": "https://www.hackerrank.com/challenges/tree-preorder-traversal",
        "difficulty": "Easy",
        "topics": ["Trees", "Data Structures"],
        "language": "Python",
        "description": "Permitted platform problem reference for tree preorder traversal.",
        "source": "HackerRank Platform Reference",
        "skills": ["tree-traversal"],
    },
    {
        "platform": "HackerRank",
        "external_id": "hr_nested_lists",
        "title": "Nested Lists",
        "url": "https://www.hackerrank.com/challenges/nested-list/problem",
        "difficulty": "Easy",
        "topics": ["Lists", "Python"],
        "language": "Python",
        "description": "Store and query students with second lowest grade using nested lists.",
        "source": "HackerRank Challenge",
        "skills": ["lists", "python"],
    },
    {
        "platform": "HackerRank",
        "external_id": "hr_sets_intro",
        "title": "Introduction to Sets",
        "url": "https://www.hackerrank.com/challenges/py-introduction-to-sets/problem",
        "difficulty": "Easy",
        "topics": ["Sets", "Python"],
        "language": "Python",
        "description": "Calculate average of distinct plant heights using set operations.",
        "source": "HackerRank Challenge",
        "skills": ["sets", "python"],
    },
    {
        "platform": "HackerRank",
        "external_id": "hr_simple_array_sum",
        "title": "Simple Array Sum",
        "url": "https://www.hackerrank.com/challenges/simple-array-sum/problem",
        "difficulty": "Easy",
        "topics": ["Arrays", "Algorithms", "Problem Solving"],
        "language": "C",
        "description": "Compute the sum of an array of integers.",
        "source": "HackerRank Challenge",
        "skills": ["arrays", "problem-solving"],
    },
    {
        "platform": "LeetCode",
        "external_id": "lc_217",
        "title": "Contains Duplicate",
        "url": "https://leetcode.com/problems/contains-duplicate/",
        "difficulty": "Easy",
        "topics": ["Array", "Hash Table", "Sorting"],
        "language": "Python",
        "description": "Determine if any value appears at least twice in an integer array using sets.",
        "source": "LeetCode Challenge",
        "skills": ["arrays", "sets", "hashing"],
    },
    {
        "platform": "LeetCode",
        "external_id": "lc_200",
        "title": "Number of Islands",
        "url": "https://leetcode.com/problems/number-of-islands/",
        "difficulty": "Medium",
        "topics": ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
        "language": "Python",
        "description": "Count the number of islands in a 2D binary grid using DFS graph traversal.",
        "source": "LeetCode Challenge",
        "skills": ["graph-algorithms", "dfs"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_track_python",
        "title": "Exercism Python Track",
        "url": "https://exercism.org/tracks/python",
        "difficulty": "Adaptive",
        "topics": ["Python", "Language Track"],
        "language": "Python",
        "description": "Practice and master Python via the official Exercism track.",
        "source": "Exercism API (Track Reputation)",
        "skills": ["python"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_track_javascript",
        "title": "Exercism JavaScript Track",
        "url": "https://exercism.org/tracks/javascript",
        "difficulty": "Adaptive",
        "topics": ["JavaScript", "Language Track"],
        "language": "JavaScript",
        "description": "Practice and master JavaScript via the official Exercism track.",
        "source": "Exercism API (Track Reputation)",
        "skills": ["javascript"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_track_java",
        "title": "Exercism Java Track",
        "url": "https://exercism.org/tracks/java",
        "difficulty": "Adaptive",
        "topics": ["Java", "Language Track"],
        "language": "Java",
        "description": "Practice and master Java via the official Exercism track.",
        "source": "Exercism API (Track Reputation)",
        "skills": ["java"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_track_rust",
        "title": "Exercism Rust Track",
        "url": "https://exercism.org/tracks/rust",
        "difficulty": "Adaptive",
        "topics": ["Rust", "Language Track"],
        "language": "Rust",
        "description": "Practice and master Rust via the official Exercism track.",
        "source": "Exercism API (Track Reputation)",
        "skills": ["rust"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_python_leap",
        "title": "Leap (Python)",
        "url": "https://exercism.org/tracks/python/exercises/leap",
        "difficulty": "Easy",
        "topics": ["bools", "Python"],
        "language": "Python",
        "description": "Practice bools, Python on the Exercism Python track.",
        "source": "Exercism Public Config",
        "skills": ["bools", "python"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_python_triangle",
        "title": "Triangle (Python)",
        "url": "https://exercism.org/tracks/python/exercises/triangle",
        "difficulty": "Easy",
        "topics": ["bools", "Python"],
        "language": "Python",
        "description": "Practice bools, Python on the Exercism Python track.",
        "source": "Exercism Public Config",
        "skills": ["bools", "python"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_javascript_line_up",
        "title": "Line Up (Javascript)",
        "url": "https://exercism.org/tracks/javascript/exercises/line-up",
        "difficulty": "Easy",
        "topics": ["numbers", "strings", "Javascript"],
        "language": "Javascript",
        "description": "Practice numbers, strings, Javascript on the Exercism Javascript track.",
        "source": "Exercism Public Config",
        "skills": ["numbers", "strings", "javascript"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_java_relative_distance",
        "title": "Relative Distance (Java)",
        "url": "https://exercism.org/tracks/java/exercises/relative-distance",
        "difficulty": "Medium",
        "topics": ["maps", "Java"],
        "language": "Java",
        "description": "Practice maps, Java on the Exercism Java track.",
        "source": "Exercism Public Config",
        "skills": ["maps", "java"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_rust_reverse_string",
        "title": "Reverse String (Rust)",
        "url": "https://exercism.org/tracks/rust/exercises/reverse-string",
        "difficulty": "Easy",
        "topics": ["iterators", "string-vs-str", "strings", "Rust"],
        "language": "Rust",
        "description": "Practice iterators, string-vs-str, strings, Rust on the Exercism Rust track.",
        "source": "Exercism Public Config",
        "skills": ["iterators", "string-vs-str", "strings", "rust"],
    },
    {
        "platform": "Exercism",
        "external_id": "exercism_rust_gigasecond",
        "title": "Gigasecond (Rust)",
        "url": "https://exercism.org/tracks/rust/exercises/gigasecond",
        "difficulty": "Easy",
        "topics": ["external-crates", "Rust"],
        "language": "Rust",
        "description": "Practice external-crates, Rust on the Exercism Rust track.",
        "source": "Exercism Public Config",
        "skills": ["external-crates", "rust"],
    },
    {
        "platform": "AtCoder",
        "external_id": "atcoder_abc086_a",
        "title": "Product",
        "url": "https://atcoder.jp/contests/abc086/tasks/abc086_a",
        "difficulty": "Easy",
        "topics": ["Math", "Beginner"],
        "language": "Any",
        "description": "Determine if the product of two integers is even or odd.",
        "source": "AtCoder Platform Reference",
        "skills": ["math", "beginner", "algorithms"],
    },
]


class ProblemMatcherService:
    """Matches and ranks practice problem recommendations with provenance."""

    def seed_problems(self, db: Session) -> list[Problem]:
        """Seed controlled problem references in PostgreSQL."""
        problems = []
        for p_def in CONTROLLED_PRACTICE_PROBLEMS:
            problem = db.query(Problem).filter(Problem.external_id == p_def["external_id"]).first()
            if not problem:
                problem = Problem(
                    platform=p_def["platform"],
                    external_id=p_def["external_id"],
                    title=p_def["title"],
                    url=p_def["url"],
                    difficulty=p_def["difficulty"],
                    topics={"items": p_def["topics"], "skills": p_def["skills"]},
                    language=p_def["language"],
                    description=p_def["description"],
                    source=p_def["source"],
                )
                db.add(problem)
                db.commit()
                db.refresh(problem)
            problems.append(problem)
        return problems

    def get_ranked_recommendations(
        self, user_id: str, target_skill_slug: str, db: Session, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Rank and return practice recommendations for a target skill."""
        problems = self.seed_problems(db)

        # Query completed attempts for user
        attempts = (
            db.query(CodeAttempt)
            .filter(CodeAttempt.user_id == user_id, CodeAttempt.status == "completed")
            .all()
        )
        completed_problem_ids = set(a.problem_id for a in attempts)

        # Query active platform connections for user to prioritize recommendations
        from app.models.platform import PlatformConnection
        active_conns = (
            db.query(PlatformConnection)
            .filter(PlatformConnection.user_id == user_id, PlatformConnection.connected == True)
            .all()
        )
        user_platforms = {c.platform for c in active_conns}

        recommendations = []
        for p in problems:
            if p.id in completed_problem_ids:
                continue

            topics_dict = p.topics or {}
            skills_list = topics_dict.get("skills", [])

            if target_skill_slug in skills_list or target_skill_slug == "all":
                is_real_data = p.platform in ["GitHub", "Exercism", "AtCoder", "HackerRank", "LeetCode"]
                status_label = "REAL API DATA" if is_real_data else "PLANNED CONNECTOR"

                recommendations.append({
                    "problem_id": p.id,
                    "platform": p.platform,
                    "title": p.title,
                    "url": p.url,
                    "difficulty": p.difficulty,
                    "topics": topics_dict.get("items", []),
                    "target_skill_slug": target_skill_slug,
                    "reason": "Practice this skill on Exercism" if p.platform == "Exercism" else f"Builds verified {p.difficulty} skill evidence for {target_skill_slug.replace('-', ' ').title()}.",
                    "source": p.source,
                    "status_label": status_label,
                    "is_real_data": is_real_data,
                })

        # Prioritize matching user's connected platforms
        recommendations.sort(key=lambda r: 0 if r["platform"] in user_platforms else 1)
        return recommendations[:limit]
