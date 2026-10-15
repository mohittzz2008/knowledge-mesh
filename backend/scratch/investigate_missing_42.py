import httpx
import re
from html import unescape

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def main():
    username = "tourist"
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text

        print("=== SEARCH FOR ALL SECTIONS & CONTAINERS IN PROFILE HTML ===")
        sections = re.findall(r'<section[^>]*class=["\']([^"\']+)["\'][^>]*>', html)
        print("All section classes found in HTML:")
        for s in set(sections):
            print("  Section class:", s)

        # Search for any other text spans or p elements containing problem names or codes anywhere in HTML
        all_spans_in_page = re.findall(r'<span[^>]*>(.*?)</span>', html, re.DOTALL)
        print(f"\nTotal <span> elements in entire HTML page: {len(all_spans_in_page)}")

        # Search for any contest list in javascript variables
        # Look for problems array in JS script tags
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
        for idx, sc in enumerate(scripts):
            if "problem" in sc.lower() or "solved" in sc.lower():
                print(f"\nScript #{idx} contains 'problem/solved' (length {len(sc)}):")
                # Look for arrays or lists of problem codes
                codes_in_script = re.findall(r'["\']code["\']\s*:\s*["\']([A-Za-z0-9_]+)["\']', sc)
                if codes_in_script:
                    print(f"  Found {len(codes_in_script)} codes in script #{idx}: {codes_in_script[:15]}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
