import httpx
import re
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def main():
    username = "tourist"
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        # 1. Fetch main user profile HTML
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        print("HTML length:", len(html))
        
        # Search for any embedded JSON state in script tags
        script_tags = re.findall(r'<script.*?>(.*?)</script>', html, re.DOTALL)
        print("Script tags found:", len(script_tags))
        for idx, s in enumerate(script_tags):
            if "problem" in s.lower() or "solved" in s.lower() or "rating" in s.lower():
                print(f"Script {idx} snippet (len {len(s)}):", s[:200].replace('\n', ' '))
                if "all_rating" in s:
                    print("--> Found all_rating script snippet:", s[:300])

        # Search for problem codes in HTML with various regex patterns
        probs_section = re.search(r'Fully Solved.*?</section>', html, re.DOTALL | re.IGNORECASE)
        if probs_section:
            print("Found Fully Solved section in HTML!")
            print(probs_section.group(0)[:500])
        else:
            print("Fully Solved section NOT found in static HTML")

        # Check for problem links in HTML
        problem_links = re.findall(r'/problems/([A-Za-z0-9_]+)', html)
        print("Problem links in HTML:", set(problem_links))

        # Check alternative potential API endpoints
        endpoints_to_test = [
            f"https://www.codechef.com/api/ratings/all?username={username}",
            f"https://www.codechef.com/api/user/problems/{username}",
            f"https://www.codechef.com/users/solved/{username}",
            f"https://codechef-api.vercel.app/handle/{username}",
            f"https://codechef-api.vercel.app/{username}",
        ]
        
        for ep in endpoints_to_test:
            try:
                r = await client.get(ep)
                print(f"Endpoint {ep} -> Status: {r.status_code}, Content-Type: {r.headers.get('content-type')}, Snippet: {r.text[:200]}")
            except Exception as e:
                print(f"Endpoint {ep} -> Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
