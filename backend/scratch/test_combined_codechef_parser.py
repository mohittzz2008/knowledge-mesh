import httpx
import re
from html import unescape

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
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
            # Convert problem title to URL slug/code
            code = re.sub(r'[^A-Za-z0-9_]+', '', cleaned_title.upper()) or "PROBLEM"
            solved_items.append({
                "problem_title": cleaned_title,
                "problem_code": code,
            })

    # Strategy 2: Extract problem codes/links from <a href=".../problems/CODE">
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

async def test_user(username):
    print(f"\n=================== TESTING USER: {username} ===================")
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        if res.status_code == 200:
            problems = extract_codechef_solved_problems(res.text)
            print(f"Extracted Solved Problems Count: {len(problems)}")
            for idx, p in enumerate(problems[:10]):
                print(f"  {idx+1}. Code: {p['problem_code']} | Title: {p['problem_title']} | URL: https://www.codechef.com/problems/{p['problem_code']}")
        else:
            print("HTTP Error:", res.status_code)

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_user("tourist"))
    asyncio.run(test_user("admin"))
