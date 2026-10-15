import httpx
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def check_user(username):
    print(f"\n=================== USER: {username} ===================")
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        print("HTML Status:", res.status_code, "Length:", len(html))
        
        # 1. Search for 'problems' or 'solved' in html (case insensitive)
        matches = re.findall(r'.{0,50}(?:problems|solved|practice).{0,50}', html, re.IGNORECASE)
        print(f"Total keyword matches: {len(matches)}")
        for m in matches[:10]:
            print("  MATCH:", m.strip().replace('\n', ' '))
            
        # 2. Check for any section or article or div elements
        div_classes = set(re.findall(r'class=["\']([^"\']+)["\']', html))
        solved_classes = [c for c in div_classes if 'prob' in c.lower() or 'solved' in c.lower() or 'content' in c.lower() or 'section' in c.lower()]
        print("Classes with prob/solved/content/section:", solved_classes)

        # 3. Check for any uppercase problem codes after /status/ or /problems/ or in <a> tags
        all_links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)
        print("Total <a> links in HTML:", len(all_links))
        problem_links = [link for link in all_links if 'status' in link[0] or 'problems' in link[0] or 'tags' in link[0]]
        print("Problem/status links count:", len(problem_links))
        for l in problem_links[:10]:
            print("  LINK:", l)

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_user("tourist"))
    asyncio.run(check_user("admin"))
