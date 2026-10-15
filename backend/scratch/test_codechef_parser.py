import httpx
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def inspect_section(username):
    print(f"\n=================== USER: {username} ===================")
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        
        # Search for section.problems-solved
        match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            print(f"Found problems-solved section (Length: {len(content)})")
            
            # Extract total solved count header if present
            total_solved_match = re.search(r'Total Problems Solved:\s*(\d+)', content, re.IGNORECASE)
            if total_solved_match:
                print("Total Problems Solved header count:", total_solved_match.group(1))

            # Extract all problem codes from hrefs matching /problems/CODE or /status/CODE or /{CONTEST}/problems/CODE
            # Pattern 1: href="/problems/CODE" or href="/status/CODE,user"
            codes = re.findall(r'href=["\'](?:/[^/]+)?/problems/([A-Za-z0-9_]+)["\']', content)
            codes_status = re.findall(r'href=["\']/status/([A-Za-z0-9_]+)', content)
            
            all_codes = sorted(list(set([c.upper() for c in codes + codes_status if len(c) >= 2 and c.upper() not in ("PRACTICE", "EASY", "MEDIUM", "HARD", "SCHOOL", "CHALLENGE")])))
            print(f"Extracted Solved Problem Codes Count: {len(all_codes)}")
            print("First 20 extracted codes:", all_codes[:20])
        else:
            print("Section rating-data-section problems-solved not found!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(inspect_section("admin"))
    asyncio.run(inspect_section("tourist"))
